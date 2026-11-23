#!/usr/bin/env node
/**
 * @description M2 会员域本地演示种子：幂等 upsert 1 名家长 + 2 名子女（纯虚构手机号 / 身份证），
 *   覆盖「已查到」与「未查到（信息不一致）」两种查询状态。只写 talent_parents / talent_children，
 *   不清空其他天赋数据，不触碰旧 talent_customers 系列集合。
 *   仅限本机开发库：需显式 `TALENT_MEMBER_SEED_CONFIRM=member`，拒绝 `NODE_ENV=production`。
 * @file scripts/seed-talent-member.mjs
 */
import crypto from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";
import { loadDotEnv, PB_URL_DEFAULT } from "./_pb.mjs";

/** 显式确认门槛：避免误把演示数据写进真实开发库。 */
export const TALENT_MEMBER_SEED_CONFIRM = "member";

/** 与 server/utils/talent-member-crypto.ts 保持一致；测试会交叉校验派生结果。 */
const MOBILE_HMAC_DOMAIN = "talent-member-mobile-hmac";
const IDNO_HMAC_DOMAIN = "talent-member-idno-hmac";
const HMAC_KEY_SALT = "talent-member-hmac-v1";
const ENCRYPTION_SALT = "crypto-salt";

/** 纯虚构家长：手机号 / 身份证均为格式合法但不存在的演示数据。 */
export const TALENT_MEMBER_SEED_PARENT = {
  parentNo: "P202611160001",
  name: "演示家长",
  mobile: "13800000001",
  idNo: "110101198803121234",
  gender: "female",
  birthday: "1988-03-12",
  source: "mock",
  status: "1",
  registeredAt: "2026-11-16 10:00:00.000Z",
  remark: "M2 本地演示家长（纯虚构数据，禁止生产写入）",
};

/** 纯虚构子女：1 名已查到 + 1 名未查到（信息不一致）。 */
export const TALENT_MEMBER_SEED_CHILDREN = [
  {
    name: "演示子女一",
    gender: "female",
    birthday: "2016-09-08",
    relation: "mother",
    idNo: "110101201609081234",
    query: "found",
    queryReason: "",
    querySeq: 1,
    queryAttempts: 1,
    queryAt: "2026-11-16 10:05:00.000Z",
  },
  {
    name: "演示子女二",
    gender: "male",
    birthday: "2019-05-20",
    relation: "mother",
    idNo: "110101201905201234",
    query: "not_found",
    queryReason: "info_mismatch",
    querySeq: 1,
    queryAttempts: 1,
    queryAt: "2026-11-16 10:05:00.000Z",
  },
];

/** 手机号归一化（与服务端一致：去空格 / 连字符 / +86）。 */
export function normalizeSeedMobile(input) {
  let value = String(input ?? "").trim().replace(/[\s-]/g, "");
  if (value.startsWith("+86")) value = value.slice(3);
  return value;
}

/** 身份证归一化（与服务端一致：去空白、转大写）。 */
export function normalizeSeedIdNo(input) {
  return String(input ?? "").trim().replace(/\s/g, "").toUpperCase();
}

function encryptionKeyOf(envKey) {
  const key = String(envKey ?? "").trim();
  if (!key || key.length < 32)
    throw new Error("ENCRYPTION_KEY 未配置或长度不足 32 位，无法生成会员演示密文");
  return key;
}

function encryptSeedValue(text, envKey) {
  const key = crypto.scryptSync(encryptionKeyOf(envKey), ENCRYPTION_SALT, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(String(text), "utf8")),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
}

function hmacSeedHash(value, domain, envKey) {
  const baseKey = crypto.scryptSync(
    encryptionKeyOf(envKey),
    HMAC_KEY_SALT,
    32,
  );
  const domainKey = crypto
    .createHmac("sha256", baseKey)
    .update(domain, "utf8")
    .digest();
  return crypto
    .createHmac("sha256", domainKey)
    .update(String(value), "utf8")
    .digest("hex");
}

export function maskSeedMobile(mobile) {
  const value = normalizeSeedMobile(mobile);
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export function maskSeedIdNo(idNo) {
  const value = normalizeSeedIdNo(idNo);
  return `${value.slice(0, 4)}${"*".repeat(Math.max(value.length - 8, 0))}${value.slice(-4)}`;
}

/**
 * 生成待 upsert 的家长 / 子女记录（含三件套），供种子脚本与单元测试交叉校验使用。
 * @param {string} envKey `ENCRYPTION_KEY` 明文值（只在本机进程内使用，不落盘）。
 */
export function buildTalentMemberSeedRecords(envKey) {
  const mobile = normalizeSeedMobile(TALENT_MEMBER_SEED_PARENT.mobile);
  const parentIdNo = normalizeSeedIdNo(TALENT_MEMBER_SEED_PARENT.idNo);
  const parent = {
    parentNo: TALENT_MEMBER_SEED_PARENT.parentNo,
    name: TALENT_MEMBER_SEED_PARENT.name,
    mobileCipher: encryptSeedValue(mobile, envKey),
    mobileHash: hmacSeedHash(mobile, MOBILE_HMAC_DOMAIN, envKey),
    maskedMobile: maskSeedMobile(mobile),
    idNoCipher: encryptSeedValue(parentIdNo, envKey),
    idNoHash: hmacSeedHash(parentIdNo, IDNO_HMAC_DOMAIN, envKey),
    maskedIdNo: maskSeedIdNo(parentIdNo),
    gender: TALENT_MEMBER_SEED_PARENT.gender,
    birthday: TALENT_MEMBER_SEED_PARENT.birthday,
    source: TALENT_MEMBER_SEED_PARENT.source,
    status: TALENT_MEMBER_SEED_PARENT.status,
    registeredAt: TALENT_MEMBER_SEED_PARENT.registeredAt,
    remark: TALENT_MEMBER_SEED_PARENT.remark,
  };
  const children = TALENT_MEMBER_SEED_CHILDREN.map((child) => {
    const idNo = normalizeSeedIdNo(child.idNo);
    return {
      name: child.name,
      gender: child.gender,
      birthday: child.birthday,
      relation: child.relation,
      idNoCipher: encryptSeedValue(idNo, envKey),
      idNoHash: hmacSeedHash(idNo, IDNO_HMAC_DOMAIN, envKey),
      maskedIdNo: maskSeedIdNo(idNo),
      query: child.query,
      queryReason: child.queryReason,
      querySeq: child.querySeq,
      queryAttempts: child.queryAttempts,
      queryStartedAt: "",
      queryAt: child.queryAt,
      status: "1",
    };
  });
  return { parent, children };
}

const escapeFilter = (value) =>
  String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

async function main() {
  loadDotEnv();
  if (process.env.NODE_ENV === "production")
    throw new Error("talent:member:seed 禁止在生产环境运行");
  if (process.env.TALENT_MEMBER_SEED_CONFIRM !== TALENT_MEMBER_SEED_CONFIRM)
    throw new Error(
      "请设置 TALENT_MEMBER_SEED_CONFIRM=member，确认只向本机开发库写入 M2 会员演示数据；" +
        "建议使用临时 POCKETBASE_DATA_DIR，不要指向真实 pb_data/。",
    );
  const url = process.env.POCKETBASE_URL || PB_URL_DEFAULT;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))
    throw new Error("M2 会员种子只允许写入本机 PocketBase");
  const email = process.env.POCKETBASE_ADMIN_EMAIL || "";
  const password =
    process.env.POCKETBASE_ADMIN_PASSWORD ||
    process.env.POCKETBASE_ADMIN_PASS ||
    "";
  if (!email || !password)
    throw new Error("缺少 POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD");
  const envKey = process.env.ENCRYPTION_KEY || "";
  const records = buildTalentMemberSeedRecords(envKey);

  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(email, password);
  const collections = new Set(
    (await pb.collections.getFullList()).map((collection) => collection.name),
  );
  for (const name of ["talent_parents", "talent_children"])
    if (!collections.has(name))
      throw new Error(`缺少集合 ${name}；请先运行 pnpm env:setup（新库）或 pnpm talent:sync（存量库）`);

  const findByFilter = (collection, filter) =>
    pb
      .collection(collection)
      .getFirstListItem(filter, { $autoCancel: false })
      .catch(() => null);

  let parentCreated = false;
  let parentUpdated = false;
  const parentFilter =
    `parentNo = "${escapeFilter(records.parent.parentNo)}" || ` +
    `mobileHash = "${escapeFilter(records.parent.mobileHash)}"`;
  const existingParent = await findByFilter("talent_parents", parentFilter);
  const parent = existingParent
    ? await pb
        .collection("talent_parents")
        .update(existingParent.id, records.parent, { $autoCancel: false })
    : await pb
        .collection("talent_parents")
        .create(records.parent, { $autoCancel: false });
  if (existingParent) parentUpdated = true;
  else parentCreated = true;

  let childCreated = 0;
  let childUpdated = 0;
  const children = [];
  for (const childData of records.children) {
    const existingChild = await findByFilter(
      "talent_children",
      `idNoHash = "${escapeFilter(childData.idNoHash)}"`,
    );
    const payload = {
      ...childData,
      parentId: parent.id,
      status: "1",
      unbindAt: "",
      unbindBy: "",
    };
    const child = existingChild
      ? await pb
          .collection("talent_children")
          .update(existingChild.id, payload, { $autoCancel: false })
      : await pb
          .collection("talent_children")
          .create(payload, { $autoCancel: false });
    if (existingChild) childUpdated += 1;
    else childCreated += 1;
    children.push(child);
  }

  // ── 校验：唯一键不重复、密文 / 哈希 / 脱敏正确、库内无明文 ─────────────────────────
  const failures = [];
  const parentRows = await pb.collection("talent_parents").getFullList({
    filter: `parentNo = "${escapeFilter(records.parent.parentNo)}"`,
    $autoCancel: false,
  });
  if (parentRows.length !== 1)
    failures.push(`家长按 parentNo 计数期望 1，实际 ${parentRows.length}`);
  const mobileHashRows = await pb.collection("talent_parents").getFullList({
    filter: `mobileHash = "${escapeFilter(records.parent.mobileHash)}"`,
    $autoCancel: false,
  });
  if (mobileHashRows.length !== 1)
    failures.push(`家长按 mobileHash 计数期望 1，实际 ${mobileHashRows.length}`);
  const childRows = await pb.collection("talent_children").getFullList({
    filter: `parentId = "${parent.id}"`,
    $autoCancel: false,
  });
  if (childRows.length !== records.children.length)
    failures.push(`子女人数期望 ${records.children.length}，实际 ${childRows.length}`);
  for (const [index, child] of children.entries()) {
    const source = TALENT_MEMBER_SEED_CHILDREN[index];
    if (!source) continue;
    if (child.maskedIdNo !== maskSeedIdNo(source.idNo))
      failures.push(`${source.name} 脱敏身份证不正确：${child.maskedIdNo}`);
    if (String(child.idNoHash).length !== 64)
      failures.push(`${source.name} 身份证哈希长度不是 64`);
    if (child.query !== source.query || child.queryReason !== source.queryReason)
      failures.push(`${source.name} 查询状态与种子定义不一致`);
    if (!child.idNoCipher || !String(child.idNoCipher).includes(":"))
      failures.push(`${source.name} 身份证密文缺失或格式错误`);
    if (JSON.stringify(child).includes(source.idNo))
      failures.push(`${source.name} 记录包含身份证明文`);
    if (JSON.stringify(child).includes(String(parent.mobileCipher)))
      failures.push(`${source.name} 记录包含家长手机号密文（交叉串写）`);
  }
  if (parent.maskedMobile !== maskSeedMobile(TALENT_MEMBER_SEED_PARENT.mobile))
    failures.push(`家长脱敏手机号不正确：${parent.maskedMobile}`);
  if (String(parent.mobileHash).length !== 64)
    failures.push("家长手机号哈希长度不是 64");
  if (JSON.stringify(parent).includes(TALENT_MEMBER_SEED_PARENT.mobile))
    failures.push("家长记录包含手机号明文");
  if (JSON.stringify(parent).includes(TALENT_MEMBER_SEED_PARENT.idNo))
    failures.push("家长记录包含身份证明文");

  if (failures.length) {
    console.error(`✗ M2 会员种子校验失败：\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify(
      {
        url,
        confirm: TALENT_MEMBER_SEED_CONFIRM,
        parent: {
          id: parent.id,
          parentNo: parent.parentNo,
          name: parent.name,
          maskedMobile: parent.maskedMobile,
          maskedIdNo: parent.maskedIdNo,
          created: parentCreated,
          updated: parentUpdated,
        },
        children: children.map((child) => ({
          id: child.id,
          name: child.name,
          maskedIdNo: child.maskedIdNo,
          query: child.query,
          queryReason: child.queryReason || "",
          status: child.status,
        })),
        counts: {
          parents: parentRows.length,
          children: childRows.length,
          childCreated,
          childUpdated,
        },
        sensitive: {
          mobileCipherLength: String(parent.mobileCipher).length,
          mobileHashLength: String(parent.mobileHash).length,
          idNoHashLength: String(parent.idNoHash).length,
          plaintextStored: false,
        },
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(
      `✗ M2 会员种子失败：${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}