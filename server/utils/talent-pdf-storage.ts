/**
 * @description M8 PDF 私有存储：PocketBase `uploads(purpose="talent-report-pdf")` 或阿里云 OSS
 *   私有对象；两种模式都先 AES-256-GCM 加密再存。下发地址只能是 Nitro 代理，禁止把 PB 文件
 *   URL / OSS 签名 URL 返回浏览器（docs/specs/M8-external/spec.md §6.7、ADR 0008-D5）。
 * @file server/utils/talent-pdf-storage.ts
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type PocketBase from "pocketbase";
import type { TalentPdfStorage } from "~~/shared/types/talent-pdf";
import { getAdminPB } from "./pocketbase-client";
import { getOssConfig, isOssEnabled } from "./oss-config";
import { signOssObjectUrl, uploadOssObject } from "./oss";
import { resolveTalentPdfStorage } from "./talent-pdf-config";

export interface TalentPdfStoredObject {
  storage: TalentPdfStorage;
  /** PB uploads 记录 id 或 `oss1.{base64url({objectKey,iv,tag})}`；不含 PII。 */
  objectKey: string;
  /** 密文字节数（用于容量观测，非必需字段）。 */
  storedSize: number;
}

function talentPdfEncryptionKey(): Buffer {
  const configured = String(process.env.ENCRYPTION_KEY ?? "").trim();
  if (!configured) throw new Error("缺少 ENCRYPTION_KEY，无法安全保存报告 PDF");
  return createHash("sha256").update(configured).digest();
}

/** 密文格式：iv(12) + authTag(16) + ciphertext；自包含，PB 模式只需 uploads record id。 */
export function encryptTalentPdf(bytes: Uint8Array): Uint8Array {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", talentPdfEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(bytes)), cipher.final()]);
  return Uint8Array.from(Buffer.concat([iv, cipher.getAuthTag(), encrypted]));
}

export function decryptTalentPdf(payload: Uint8Array): Uint8Array {
  const buffer = Buffer.from(payload);
  if (buffer.byteLength < 29) throw new Error("PDF 密文格式无效");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", talentPdfEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Uint8Array.from(Buffer.concat([decipher.update(encrypted), decipher.final()]));
}

/** OSS 存储 key 封装 iv/tag（沿用旧实现的封装思路，新代码独立，不复用旧文件）。 */
function encodeOssObjectKey(objectKey: string, iv: Buffer, tag: Buffer): string {
  const payload = Buffer.from(JSON.stringify({ objectKey, iv: iv.toString("base64url"), tag: tag.toString("base64url") })).toString("base64url");
  return `oss1.${payload}`;
}

function decodeOssObjectKey(value: string): { objectKey: string; iv: Buffer; tag: Buffer } | null {
  if (!value.startsWith("oss1.")) return null;
  try {
    const payload = JSON.parse(Buffer.from(value.slice(5), "base64url").toString("utf8")) as {
      objectKey?: string;
      iv?: string;
      tag?: string;
    };
    if (!payload.objectKey || !payload.iv || !payload.tag) return null;
    return {
      objectKey: payload.objectKey,
      iv: Buffer.from(payload.iv, "base64url"),
      tag: Buffer.from(payload.tag, "base64url"),
    };
  } catch {
    return null;
  }
}

interface UploadRecord {
  id: string;
  file?: string;
}

async function storePocketBaseObject(
  pb: PocketBase,
  bytes: Uint8Array,
  fileName: string,
  encrypted: Uint8Array,
): Promise<TalentPdfStoredObject> {
  // uploads 以密文落盘，mime 用 octet-stream（内容不是可直接读取的 PDF）。
  const form = new FormData();
  form.append("file", new File([encrypted], fileName, { type: "application/octet-stream" }));
  form.append("filename", fileName);
  form.append("mimeType", "application/octet-stream");
  form.append("size", String(encrypted.byteLength));
  form.append("purpose", "talent-report-pdf");
  const record = await pb.collection("uploads").create<UploadRecord>(form, { $autoCancel: false });
  if (!record?.id) throw new Error("报告 PDF 私有存储失败");
  return { storage: "pocketbase", objectKey: record.id, storedSize: encrypted.byteLength };
}

async function storeOssObject(
  reportId: string,
  volumeId: string,
  contentHash: string,
  bytes: Uint8Array,
  encrypted: Uint8Array,
): Promise<TalentPdfStoredObject> {
  if (!isOssEnabled()) throw new Error("TALENT_PDF_STORAGE=oss 但 OSS 未开启");
  const objectName = `talent-pdf/${reportId}/${volumeId}/${contentHash}.pdf`;
  const result = await uploadOssObject(encrypted, objectName, "application/octet-stream");
  // 从密文头部取 iv/tag 写入封装 key；OSS 对象 key 只含 id 与哈希，不含 PII。
  const iv = Buffer.from(encrypted.subarray(0, 12));
  const tag = Buffer.from(encrypted.subarray(12, 28));
  return {
    storage: "oss",
    objectKey: encodeOssObjectKey(result.objectKey, iv, tag),
    storedSize: encrypted.byteLength,
  };
}

/** 加密并保存单册 PDF；`fileName` 只含报告编号与册名。 */
export async function storeTalentPdfObject(input: {
  reportId: string;
  volumeId: string;
  contentHash: string;
  fileName: string;
  bytes: Uint8Array;
}): Promise<TalentPdfStoredObject> {
  const encrypted = encryptTalentPdf(input.bytes);
  const storage = resolveTalentPdfStorage();
  if (storage === "oss")
    return storeOssObject(input.reportId, input.volumeId, input.contentHash, input.bytes, encrypted);
  const pb = await getAdminPB();
  return storePocketBaseObject(pb, input.bytes, input.fileName, encrypted);
}

async function readPocketBaseObject(objectKey: string): Promise<Uint8Array> {
  const pb = await getAdminPB();
  let record: UploadRecord | null = null;
  try {
    record = await pb.collection("uploads").getOne<UploadRecord>(objectKey, { $autoCancel: false });
  } catch {
    record = null;
  }
  const fileName = String(record?.file ?? "");
  if (!record || !fileName) throw new Error("报告 PDF 产物不存在");
  const token = await pb.files.getToken();
  const response = await fetch(pb.files.getURL(record, fileName, { token }));
  if (!response.ok) throw new Error(`读取报告 PDF 失败（${response.status}）`);
  return decryptTalentPdf(new Uint8Array(await response.arrayBuffer()));
}

async function readOssObject(objectKey: string): Promise<Uint8Array> {
  if (!isOssEnabled()) throw new Error("OSS 未开启，无法读取报告 PDF");
  const encoded = decodeOssObjectKey(objectKey);
  if (!encoded) throw new Error("OSS 报告 PDF 存储 key 无效");
  const response = await fetch(signOssObjectUrl(encoded.objectKey, 60));
  if (!response.ok) throw new Error(`读取 OSS 报告 PDF 失败（${response.status}）`);
  const payload = new Uint8Array(await response.arrayBuffer());
  const buffer = Buffer.from(payload);
  if (buffer.byteLength < 28) throw new Error("OSS 报告 PDF 密文格式无效");
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", talentPdfEncryptionKey(), encoded.iv);
  decipher.setAuthTag(encoded.tag);
  return Uint8Array.from(Buffer.concat([decipher.update(encrypted), decipher.final()]));
}

/** 读取并解密单册 PDF（只允许服务端权限代理调用）。 */
export async function readTalentPdfObject(storage: TalentPdfStorage, objectKey: string): Promise<Uint8Array> {
  if (storage === "oss") return readOssObject(objectKey);
  return readPocketBaseObject(objectKey);
}

/** OSS 可用性探测（`auto` 模式下由 resolveTalentPdfStorage 决定）。 */
export function isTalentPdfOssAvailable(): boolean {
  return Boolean(getOssConfig());
}