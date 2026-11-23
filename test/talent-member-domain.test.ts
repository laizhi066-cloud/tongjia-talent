/**
 * @description M2 会员域数据层测试：集合字段 / 索引声明、敏感字段三件套（加解密、域分离哈希、
 *   归一化、脱敏、自检与失败不降级）、18 位身份证与生日一致校验、会员编号生成与不可改、
 *   脱敏映射不含 cipher/hash、一孩一家长与重绑、解绑 / 状态派生、归属解析、
 *   查询四态与三类归因、querySeq 幂等回执守卫、30s 节流、超时扫描与 Mock 五模式。
 * @file test/talent-member-domain.test.ts
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type PocketBase from "pocketbase";
import {
  COLLECTION_DEFS,
  TALENT_MEMBER_COLLECTION_NAMES,
  TALENT_MEMBER_INDEX_DEFS,
  indexNameFromSql,
} from "../scripts/setup.mjs";
import {
  TALENT_MEMBER_SEED_CHILDREN,
  TALENT_MEMBER_SEED_PARENT,
  buildTalentMemberSeedRecords,
  maskSeedIdNo,
  maskSeedMobile,
} from "../scripts/seed-talent-member.mjs";
import type {
  TalentChildRecord,
  TalentParentRecord,
} from "~~/shared/types/talent-member";
import {
  assertTalentChildRelation,
  assertTalentChildEditable,
  assertTalentChildOwnership,
  assertTalentMemberBirthday,
  assertTalentMemberGender,
  assertTalentMemberIdNo,
  assertTalentMemberIdNoBirthday,
  assertTalentMemberMobile,
  assertTalentParentIdNoPair,
  assertTalentParentNo,
  assertTalentParentNoImmutable,
  assertTalentParentStatus,
  buildTalentChildCreateData,
  buildTalentChildRebindData,
  buildTalentChildUnbindPatch,
  buildTalentIdNoTriplet,
  buildTalentMemberChildBindingItem,
  buildTalentMobileTriplet,
  buildTalentMemberSelfBindingItem,
  extractTalentMemberIdNoBirthday,
  formatTalentParentNo,
  isTalentChildActive,
  isTalentParentActive,
  maxTalentParentNoSequence,
  nextTalentParentNo,
  normalizeTalentChildProfile,
  normalizeTalentParentProfile,
  planTalentChildCreate,
  sanitizeTalentChildRecord,
  sanitizeTalentParentRecord,
  shouldRequeryTalentChild,
  toTalentMemberListRow,
} from "~~/server/utils/talent-member";
import {
  TALENT_MEMBER_CRYPTO_ERROR_MESSAGE,
  TALENT_MEMBER_IDNO_HMAC_DOMAIN,
  TALENT_MEMBER_MOBILE_HMAC_DOMAIN,
  assertTalentMemberCryptoReady,
  decryptTalentSensitive,
  encryptTalentSensitive,
  hashTalentMemberIdNo,
  hashTalentMemberMobile,
  maskTalentIdNo,
  maskTalentMobile,
  normalizeTalentIdNo,
  normalizeTalentMobile,
} from "~~/server/utils/talent-member-crypto";
import {
  TALENT_GENE_QUERY_MOCK_SOURCE,
  TALENT_QUERY_MIN_INTERVAL_MS,
  TALENT_QUERY_TIMEOUT_HOURS_DEFAULT,
  applyTalentGeneQueryReceipt,
  createMockTalentGeneQuerySource,
  createTalentGeneQuerySource,
  markTalentChildQueryFailed,
  resolveTalentGeneQueryMockDelayMs,
  resolveTalentGeneQueryMockMode,
  resolveTalentQuerySweepIntervalMs,
  resolveTalentQueryTimeoutHours,
  setTalentMemberQueryPBProvider,
  submitTalentChildQuery,
  sweepTalentQueryTimeouts,
  type TalentGeneQueryReceipt,
  type TalentGeneQuerySource,
} from "~~/server/utils/talent-member-query";

const TEST_ENCRYPTION_KEY = "test-encryption-key-0123456789abcdef";
const MOBILE = "13800000001";
const ID_NO = "110101201609081234";

let previousEncryptionKey: string | undefined;

beforeAll(() => {
  previousEncryptionKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

afterAll(() => {
  if (previousEncryptionKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = previousEncryptionKey;
});

// ── 内存 PocketBase 假实现：只支持本模块用到的查询方法 ───────────────────────────────

type FakeRecord = Record<string, any> & { id: string };

function matchesFilter(row: Record<string, any>, filter: string): boolean {
  return filter.split(" || ").some((orPart) =>
    orPart
      .split(" && ")
      .every((term) => matchesTerm(row, term.trim())),
  );
}

function matchesTerm(row: Record<string, any>, term: string): boolean {
  const match = term.match(
    /^([A-Za-z0-9_]+)\s*(!=|=)\s*"((?:[^"\\]|\\.)*)"$/,
  );
  if (!match) return true;
  const field = match[1] || "";
  const operator = match[2] || "=";
  const expected = String(match[3] || "")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
  const actual = String(row[field] ?? "");
  return operator === "=" ? actual === expected : actual !== expected;
}

class FakePocketBase {
  private readonly data = new Map<string, FakeRecord[]>();
  private idSeq = 0;
  readonly createCounts = new Map<string, number>();

  seed(collection: string, record: Record<string, any>): FakeRecord {
    const rows = this.data.get(collection) || [];
    const row: FakeRecord = {
      created: "2026-11-16 10:00:00.000Z",
      updated: "2026-11-16 10:00:00.000Z",
      ...record,
      id: String(record.id || `${collection}_${++this.idSeq}`),
    };
    rows.push(row);
    this.data.set(collection, rows);
    return { ...row };
  }

  rows(collection: string): FakeRecord[] {
    return this.data.get(collection) || [];
  }

  find(collection: string, id: string): FakeRecord | undefined {
    return this.rows(collection).find((row) => row.id === id);
  }

  collection(name: string) {
    return {
      getOne: async (id: string) => {
        const row = this.find(name, id);
        if (!row) throw Object.assign(new Error(`404 ${name}`), { status: 404 });
        return { ...row };
      },
      getFirstListItem: async (filter: string) => {
        const row = this.rows(name).find((item) => matchesFilter(item, filter));
        if (!row) throw Object.assign(new Error(`404 ${name}`), { status: 404 });
        return { ...row };
      },
      getFullList: async (options: { filter?: string } = {}) => {
        const rows = options.filter
          ? this.rows(name).filter((row) => matchesFilter(row, options.filter || ""))
          : this.rows(name);
        return rows.map((row) => ({ ...row }));
      },
      update: async (id: string, payload: Record<string, any>) => {
        const row = this.find(name, id);
        if (!row) throw Object.assign(new Error(`404 ${name}`), { status: 404 });
        Object.assign(row, payload);
        row.updated = "2026-11-16 10:05:00.000Z";
        return { ...row };
      },
      create: async (payload: Record<string, any>) => {
        this.createCounts.set(name, (this.createCounts.get(name) || 0) + 1);
        return this.seed(name, payload);
      },
    };
  }
}

function useFakePB(fake: FakePocketBase): void {
  setTalentMemberQueryPBProvider(
    () => fake as unknown as PocketBase,
  );
}

afterEach(() => {
  setTalentMemberQueryPBProvider(null);
});

/** 等 Mock 的进程内 setTimeout 回执落地。 */
function flushTimers(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

// ── 敏感字段三件套 ─────────────────────────────────────────────────────────────────

describe("会员敏感字段三件套", () => {
  it("密文为 AES-256-GCM iv:tag:cipher 且可解密回原文", () => {
    const cipher = encryptTalentSensitive(MOBILE);
    const parts = cipher.split(":");
    expect(parts).toHaveLength(3);
    for (const part of parts) expect(part).toMatch(/^[0-9a-f]+$/);
    expect(decryptTalentSensitive(cipher)).toBe(MOBILE);
    expect(decryptTalentSensitive(encryptTalentSensitive(ID_NO))).toBe(ID_NO);
  });

  it("同一明文两次加密结果不同（随机 IV），解密一致", () => {
    const first = encryptTalentSensitive(MOBILE);
    const second = encryptTalentSensitive(MOBILE);
    expect(first).not.toBe(second);
    expect(decryptTalentSensitive(first)).toBe(MOBILE);
    expect(decryptTalentSensitive(second)).toBe(MOBILE);
  });

  it("解密失败抛 500 且不回退明文、不回显密文", () => {
    const cipher = encryptTalentSensitive(MOBILE);
    const tampered = `${cipher.slice(0, -1)}${cipher.endsWith("0") ? "1" : "0"}`;
    let message = "";
    try {
      decryptTalentSensitive(tampered);
    } catch (error) {
      message = String((error as { message?: string }).message || "");
      expect((error as { statusCode?: number }).statusCode).toBe(500);
    }
    expect(message).toBe(TALENT_MEMBER_CRYPTO_ERROR_MESSAGE);
    expect(message).not.toContain(MOBILE);
    expect(() => decryptTalentSensitive("")).toThrow();
    expect(() => decryptTalentSensitive("bad-format")).toThrow();
  });

  it("ENCRYPTION_KEY 缺失或过短时自检失败（不降级明文）", () => {
    const saved = process.env.ENCRYPTION_KEY;
    try {
      delete process.env.ENCRYPTION_KEY;
      expect(() => assertTalentMemberCryptoReady()).toThrow();
      expect(() => encryptTalentSensitive(MOBILE)).toThrow();
      process.env.ENCRYPTION_KEY = "too-short";
      expect(() => assertTalentMemberCryptoReady()).toThrow();
    } finally {
      process.env.ENCRYPTION_KEY = saved;
    }
    expect(() => assertTalentMemberCryptoReady()).not.toThrow();
  });

  it("哈希为 64 位十六进制、确定性稳定且按字段域分离", () => {
    const mobileHash = hashTalentMemberMobile(MOBILE);
    expect(mobileHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashTalentMemberMobile(MOBILE)).toBe(mobileHash);
    expect(hashTalentMemberIdNo(ID_NO)).toMatch(/^[0-9a-f]{64}$/);
    // 相同输入字符串在不同域下必须不同（手机号域与身份证域）。
    expect(hashTalentMemberMobile("110101201609081234")).not.toBe(
      hashTalentMemberIdNo("110101201609081234"),
    );
    expect(TALENT_MEMBER_MOBILE_HMAC_DOMAIN).not.toBe(
      TALENT_MEMBER_IDNO_HMAC_DOMAIN,
    );
  });

  it("手机号 / 身份证归一化后哈希一致", () => {
    expect(normalizeTalentMobile("+86 138-0000-0001")).toBe(MOBILE);
    expect(normalizeTalentMobile(" 138 0000 0001 ")).toBe(MOBILE);
    expect(hashTalentMemberMobile("+86 138-0000-0001")).toBe(
      hashTalentMemberMobile(MOBILE),
    );
    expect(normalizeTalentIdNo(" 11010120160908123x ")).toBe(
      "11010120160908123X",
    );
    expect(hashTalentMemberIdNo("11010120160908123x")).toBe(
      hashTalentMemberIdNo("11010120160908123X"),
    );
  });

  it("脱敏统一前 4 + 后 4", () => {
    expect(maskTalentMobile(MOBILE)).toBe("1380****0001");
    expect(maskTalentMobile("+86 138-0000-0001")).toBe("1380****0001");
    expect(maskTalentIdNo(ID_NO)).toBe("1101**********1234");
    expect(maskTalentIdNo(ID_NO)).toHaveLength(18);
  });

  it("种子脚本的三件套与服务端工具派生的哈希一致（防实现漂移）", () => {
    const records = buildTalentMemberSeedRecords(TEST_ENCRYPTION_KEY);
    expect(records.parent.mobileHash).toBe(
      hashTalentMemberMobile(TALENT_MEMBER_SEED_PARENT.mobile),
    );
    expect(records.parent.idNoHash).toBe(
      hashTalentMemberIdNo(TALENT_MEMBER_SEED_PARENT.idNo),
    );
    expect(decryptTalentSensitive(records.parent.mobileCipher)).toBe(
      normalizeTalentMobile(TALENT_MEMBER_SEED_PARENT.mobile),
    );
    expect(decryptTalentSensitive(records.parent.idNoCipher)).toBe(
      normalizeTalentIdNo(TALENT_MEMBER_SEED_PARENT.idNo),
    );
    expect(records.parent.maskedMobile).toBe(
      maskSeedMobile(TALENT_MEMBER_SEED_PARENT.mobile),
    );
    expect(records.parent.maskedIdNo).toBe(
      maskSeedIdNo(TALENT_MEMBER_SEED_PARENT.idNo),
    );
    expect(records.children).toHaveLength(2);
    for (const [index, child] of records.children.entries()) {
      const source = TALENT_MEMBER_SEED_CHILDREN[index];
      expect(source).toBeTruthy();
      if (!source) continue;
      expect(child.idNoHash).toBe(hashTalentMemberIdNo(source.idNo));
      expect(decryptTalentSensitive(child.idNoCipher)).toBe(source.idNo);
      expect(child.maskedIdNo).toBe(maskSeedIdNo(source.idNo));
    }
    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain(TALENT_MEMBER_SEED_PARENT.mobile);
    expect(serialized).not.toContain(TALENT_MEMBER_SEED_PARENT.idNo);
  });
});

// ── 校验：手机号 / 身份证 / 生日 / 枚举 / 编号 ──────────────────────────────────────

describe("会员资料校验", () => {
  it("手机号格式：合法归一化，非法 422", () => {
    expect(assertTalentMemberMobile("+86 138-0000-0001")).toBe(MOBILE);
    for (const invalid of ["", "12345", "23800000001", "1380000000"])
      expect(() => assertTalentMemberMobile(invalid)).toThrow();
  });

  it("身份证 18 位、末位 X 归一化、不校验校验位", () => {
    expect(assertTalentMemberIdNo("11010120160908123x")).toBe(
      "11010120160908123X",
    );
    // 末位不符合 GB 校验码也允许（Q8 明确不校验末位）。
    expect(assertTalentMemberIdNo("110101201609081230")).toBe(
      "110101201609081230",
    );
    for (const invalid of ["11010120160908123", "1101012016090812345", "11010120160908123A"])
      expect(() => assertTalentMemberIdNo(invalid)).toThrow();
  });

  it("身份证第 7–14 位生日：合法日期、与生日强一致", () => {
    expect(extractTalentMemberIdNoBirthday(ID_NO)).toBe("2016-09-08");
    expect(() => assertTalentMemberIdNoBirthday(ID_NO, "2016-09-08")).not.toThrow();
    expect(() =>
      assertTalentMemberIdNoBirthday(ID_NO, "2016-09-09"),
    ).toThrow(/身份证号与出生日期不一致/);
    // 身份证内嵌不存在的日期（2016-02-30）不合法。
    expect(() =>
      extractTalentMemberIdNoBirthday("110101201602301234"),
    ).toThrow(/出生日期不合法/);
  });

  it("生日：合法、不得晚于今天、拒绝不存在的日期", () => {
    expect(assertTalentMemberBirthday("2016-09-08")).toBe("2016-09-08");
    expect(assertTalentMemberBirthday("")).toBe("");
    expect(() => assertTalentMemberBirthday("", { required: true })).toThrow();
    expect(() => assertTalentMemberBirthday("2999-01-01")).toThrow(/不能晚于今天/);
    expect(() => assertTalentMemberBirthday("2026-02-30")).toThrow(/YYYY-MM-DD/);
    expect(() => assertTalentMemberBirthday("2016/09/08")).toThrow(/YYYY-MM-DD/);
  });

  it("家长身份证 + 生日成对校验", () => {
    expect(assertTalentParentIdNoPair({})).toEqual({ idNo: "", birthday: "" });
    expect(
      assertTalentParentIdNoPair({ birthday: "1988-03-12" }),
    ).toEqual({ idNo: "", birthday: "1988-03-12" });
    expect(() =>
      assertTalentParentIdNoPair({ idNo: "110101198803121234" }),
    ).toThrow(/必须填写出生日期/);
    expect(
      assertTalentParentIdNoPair({
        idNo: "110101198803121234",
        birthday: "1988-03-12",
      }),
    ).toEqual({ idNo: "110101198803121234", birthday: "1988-03-12" });
    expect(() =>
      assertTalentParentIdNoPair({
        idNo: "110101198803121234",
        birthday: "1988-03-13",
      }),
    ).toThrow(/不一致/);
  });

  it("性别 / 与家长关系 / 来源 / 状态枚举校验", () => {
    expect(assertTalentMemberGender("male")).toBe("male");
    expect(() => assertTalentMemberGender("M")).toThrow();
    expect(assertTalentChildRelation("grandfather_maternal")).toBe(
      "grandfather_maternal",
    );
    expect(() => assertTalentChildRelation("child")).toThrow();
    expect(assertTalentParentStatus("1")).toBe("1");
    expect(assertTalentParentStatus("0")).toBe("0");
    expect(() => assertTalentParentStatus("2")).toThrow();
  });

  it("会员编号：格式、当日序号生成、不可修改", () => {
    expect(formatTalentParentNo("2026-11-16", 1)).toBe("P202611160001");
    expect(formatTalentParentNo("2026-11-16", 42)).toBe("P202611160042");
    expect(assertTalentParentNo("P202611160001")).toBe("P202611160001");
    expect(() => assertTalentParentNo("P20261116001")).toThrow();
    expect(() => assertTalentParentNo("A202611160001")).toThrow();
    expect(() => formatTalentParentNo("2026-11-16", 0)).toThrow();
    expect(() => formatTalentParentNo("2026-11-16", 10000)).toThrow();
    expect(
      maxTalentParentNoSequence(
        ["P202611160001", "P202611160003", "P202611150009", "bad"],
        "2026-11-16",
      ),
    ).toBe(3);
    expect(
      nextTalentParentNo(["P202611160001", "P202611160003"], "2026-11-16"),
    ).toBe("P202611160004");
    expect(nextTalentParentNo([], "2026-11-16")).toBe("P202611160001");
    expect(() =>
      assertTalentParentNoImmutable("P202611160001", "P202611160002"),
    ).toThrow(/不可修改/);
    expect(() =>
      assertTalentParentNoImmutable("P202611160001", "P202611160001"),
    ).not.toThrow();
    expect(() =>
      assertTalentParentNoImmutable("P202611160001", undefined),
    ).not.toThrow();
  });

  it("家长 / 子女资料归一化生成三件套且不落明文", () => {
    const parent = normalizeTalentParentProfile({
      name: " 演示家长 ",
      mobile: "+86 138-0000-0001",
      idNo: "110101198803121234",
      birthday: "1988-03-12",
      gender: "female",
      remark: "备注",
    });
    expect(parent.name).toBe("演示家长");
    expect(parent.mobile).toBe(MOBILE);
    expect(parent.mobileTriplet?.mobileHash).toBe(hashTalentMemberMobile(MOBILE));
    expect(parent.mobileTriplet?.maskedMobile).toBe("1380****0001");
    expect(parent.idNoTriplet?.maskedIdNo).toBe("1101**********1234");
    expect(parent.source).toBe("admin");
    expect(parent.birthday).toBe("1988-03-12");

    const child = normalizeTalentChildProfile({
      name: "演示子女一",
      gender: "female",
      birthday: "2016-09-08",
      relation: "mother",
      idNo: "110101201609081234",
    });
    expect(child.idNoHash).toBe(hashTalentMemberIdNo(ID_NO));
    expect(child.maskedIdNo).toBe("1101**********1234");
    expect(child.relation).toBe("mother");
    expect(() =>
      normalizeTalentChildProfile({
        name: "演示子女一",
        gender: "female",
        birthday: "2016-09-09",
        relation: "mother",
        idNo: "110101201609081234",
      }),
    ).toThrow(/不一致/);
  });

  it("新建 / 重绑子女落库数据：初始未查询、重绑清空解绑并复用档案", () => {
    const create = buildTalentChildCreateData(
      {
        name: "演示子女一",
        gender: "female",
        birthday: "2016-09-08",
        relation: "mother",
        idNo: "110101201609081234",
      },
      "parent_1",
    );
    expect(create).toMatchObject({
      parentId: "parent_1",
      query: "unqueried",
      queryReason: "",
      querySeq: 0,
      queryAttempts: 0,
      status: "1",
      maskedIdNo: "1101**********1234",
    });
    expect(JSON.stringify(create)).not.toContain(ID_NO);
    const rebind = buildTalentChildRebindData(
      {
        name: "演示子女一",
        gender: "female",
        birthday: "2016-09-08",
        relation: "father",
        idNo: "110101201609081234",
      },
      "parent_2",
    );
    expect(rebind).toMatchObject({
      parentId: "parent_2",
      status: "1",
      unbindAt: "",
      unbindBy: "",
      querySeq: 0,
    });
    expect(rebind.relation).toBe("father");
  });

  it("三件套构建函数返回密文 / 哈希 / 脱敏三件", () => {
    const mobile = buildTalentMobileTriplet(MOBILE);
    expect(mobile.maskedMobile).toBe("1380****0001");
    expect(mobile.mobileHash).toHaveLength(64);
    expect(decryptTalentSensitive(mobile.mobileCipher)).toBe(MOBILE);
    const idNo = buildTalentIdNoTriplet(ID_NO);
    expect(idNo.maskedIdNo).toBe("1101**********1234");
    expect(idNo.idNoHash).toHaveLength(64);
    expect(decryptTalentSensitive(idNo.idNoCipher)).toBe(ID_NO);
  });
});

// ── schema / 索引声明 ──────────────────────────────────────────────────────────────

describe("M2 集合与唯一索引声明", () => {
  const collection = (name: string) =>
    COLLECTION_DEFS.find((definition) => definition.name === name);

  it("新增 talent_parents / talent_children 两个集合，M6 旧集合已删除", () => {
    const names = COLLECTION_DEFS.map((definition) => definition.name);
    expect(names).toEqual(expect.arrayContaining([...TALENT_MEMBER_COLLECTION_NAMES]));
    expect(names).not.toContain("talent_customers");
    expect(names).not.toContain("talent_customer_bindings");
  });

  it("talent_parents 字段与关系符合设计", () => {
    const parents = collection("talent_parents");
    expect(parents).toBeTruthy();
    const parentFields = (parents?.fields || []) as Array<{
      name: string;
      required?: boolean;
    }>;
    const fields = parentFields.map((field) => field.name);
    expect(fields).toEqual(
      expect.arrayContaining([
        "parentNo",
        "name",
        "mobileCipher",
        "mobileHash",
        "maskedMobile",
        "idNoCipher",
        "idNoHash",
        "maskedIdNo",
        "gender",
        "birthday",
        "source",
        "status",
        "registeredAt",
        "remark",
      ]),
    );
    // 家长身份证选填：idNoHash / maskedIdNo 不标 required，唯一性由部分唯一索引保证。
    expect(
      parentFields.find((field) => field.name === "idNoHash")?.required,
    ).not.toBe(true);
    expect(parents?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "userId",
          target: "users",
          maxSelect: 1,
          cascadeDelete: false,
        }),
        expect.objectContaining({ name: "createdBy", target: "users" }),
        expect.objectContaining({ name: "updatedBy", target: "users" }),
      ]),
    );
  });

  it("talent_children 字段与 parentId / unbindBy 关系符合设计", () => {
    const children = collection("talent_children");
    expect(children).toBeTruthy();
    const childFields = (children?.fields || []) as Array<{
      name: string;
      required?: boolean;
    }>;
    const fieldNames = childFields.map((field) => field.name);
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        "name",
        "gender",
        "birthday",
        "relation",
        "idNoCipher",
        "idNoHash",
        "maskedIdNo",
        "query",
        "queryReason",
        "querySeq",
        "queryAttempts",
        "queryStartedAt",
        "queryAt",
        "status",
        "unbindAt",
      ]),
    );
    // PB required number 等价于「不能为 0」，新建初值 0，因此不能标 required。
    expect(
      childFields.find((field) => field.name === "querySeq")?.required,
    ).not.toBe(true);
    expect(children?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "parentId",
          target: "talent_parents",
          maxSelect: 1,
          cascadeDelete: false,
        }),
        expect.objectContaining({ name: "unbindBy", target: "users" }),
      ]),
    );
  });

  it("索引清单：唯一键、部分唯一索引与普通索引齐全", () => {
    const byName = new Map(
      TALENT_MEMBER_INDEX_DEFS.map(([collectionName, sql]) => [
        indexNameFromSql(String(sql || "")),
        { collectionName, sql: String(sql || "") },
      ]),
    );
    for (const name of [
      "idx_talent_parents_no",
      "idx_talent_parents_mobile",
      "idx_talent_parents_idno",
      "idx_talent_parents_user",
      "idx_talent_parents_status",
      "idx_talent_children_idno",
      "idx_talent_children_parent",
      "idx_talent_children_query",
      "idx_talent_children_parent_status",
    ])
      expect(byName.has(name)).toBe(true);
    expect(byName.get("idx_talent_parents_no")?.sql).toContain("UNIQUE");
    expect(byName.get("idx_talent_parents_mobile")?.sql).toContain("UNIQUE");
    expect(byName.get("idx_talent_parents_idno")?.sql).toContain(
      'WHERE idNoHash != ""',
    );
    expect(byName.get("idx_talent_parents_user")?.sql).toContain(
      'WHERE userId != ""',
    );
    expect(byName.get("idx_talent_children_idno")?.sql).toContain("UNIQUE");
    expect(byName.get("idx_talent_children_parent_status")?.collectionName).toBe(
      "talent_children",
    );
  });
});

// ── 脱敏映射 / 状态派生 / 归属 ────────────────────────────────────────────────────

function parentRecord(
  overrides: Partial<TalentParentRecord> = {},
): TalentParentRecord {
  return {
    id: "parent_1",
    created: "2026-11-16 10:00:00.000Z",
    updated: "2026-11-16 10:00:00.000Z",
    parentNo: "P202611160001",
    name: "演示家长",
    mobileCipher: "aa:bb:cc",
    mobileHash: "a".repeat(64),
    maskedMobile: "1380****0001",
    idNoCipher: "dd:ee:ff",
    idNoHash: "b".repeat(64),
    maskedIdNo: "1101**********1234",
    gender: "female",
    birthday: "1988-03-12",
    source: "admin",
    status: "1",
    registeredAt: "2026-11-16 10:00:00.000Z",
    remark: "",
    userId: "user_1",
    ...overrides,
  };
}

function childRecord(
  overrides: Partial<TalentChildRecord> = {},
): TalentChildRecord {
  return {
    id: "child_1",
    created: "2026-11-16 10:00:00.000Z",
    updated: "2026-11-16 10:00:00.000Z",
    parentId: "parent_1",
    name: "演示子女一",
    gender: "female",
    birthday: "2016-09-08",
    relation: "mother",
    idNoCipher: "11:22:33",
    idNoHash: "c".repeat(64),
    maskedIdNo: "1101**********1234",
    query: "found",
    queryReason: "",
    querySeq: 1,
    queryAttempts: 1,
    queryStartedAt: "",
    queryAt: "2026-11-16 10:05:00.000Z",
    status: "1",
    ...overrides,
  };
}

describe("脱敏映射与状态派生", () => {
  it("家长视图不含 cipher / hash，标签与绑定状态正确", () => {
    const view = sanitizeTalentParentRecord(parentRecord());
    const serialized = JSON.stringify(view);
    for (const forbidden of [
      "mobileCipher",
      "mobileHash",
      "idNoCipher",
      "idNoHash",
      "aa:bb:cc",
      "dd:ee:ff",
      "a".repeat(64),
    ])
      expect(serialized).not.toContain(forbidden);
    expect(view).toMatchObject({
      maskedMobile: "1380****0001",
      maskedIdNo: "1101**********1234",
      idNoMissing: false,
      genderLabel: "女",
      sourceLabel: "后台录入",
      statusLabel: "正常",
      accountBound: true,
    });
  });

  it("未填家长身份证时 idNoMissing=true 且不返回查看入口数据", () => {
    const view = sanitizeTalentParentRecord(
      parentRecord({ idNoCipher: "", idNoHash: "", maskedIdNo: "" }),
    );
    expect(view.idNoMissing).toBe(true);
    expect(view.maskedIdNo).toBe("");
    expect(view.accountBound).toBe(true);
  });

  it("子女视图：四态标签、三类归因仅在未查到时展示", () => {
    expect(
      sanitizeTalentChildRecord(childRecord({ query: "unqueried" })),
    ).toMatchObject({ queryLabel: "未查询", queryReasonLabel: "" });
    expect(
      sanitizeTalentChildRecord(childRecord({ query: "querying" })),
    ).toMatchObject({ queryLabel: "查询中", queryReason: "" });
    expect(
      sanitizeTalentChildRecord(
        childRecord({ query: "not_found", queryReason: "api_error" }),
      ),
    ).toMatchObject({ queryLabel: "未查到", queryReasonLabel: "接口异常" });
    // found 状态下即使库里有脏 reason 也不返回。
    expect(
      sanitizeTalentChildRecord(
        childRecord({ query: "found", queryReason: "no_result" }),
      ),
    ).toMatchObject({ queryReason: "", queryReasonLabel: "" });
    const serialized = JSON.stringify(sanitizeTalentChildRecord(childRecord()));
    expect(serialized).not.toContain("idNoCipher");
    expect(serialized).not.toContain("11:22:33");
  });

  it("家长停用时子女派生展示「已停用」但不改 status 字段", () => {
    const view = sanitizeTalentChildRecord(childRecord(), {
      parentStatus: "0",
    });
    expect(view.status).toBe("1");
    expect(view.statusLabel).toBe("已停用");
    expect(
      sanitizeTalentChildRecord(childRecord({ status: "2" }), {
        parentStatus: "1",
      }).statusLabel,
    ).toBe("已解绑");
  });

  it("列表行聚合计数与 C 端 bindings item", () => {
    const row = toTalentMemberListRow(parentRecord(), {
      childCount: 2,
      reportCount: 0,
    });
    expect(row).toMatchObject({ childCount: 2, reportCount: 0 });
    const self = buildTalentMemberSelfBindingItem(
      sanitizeTalentParentRecord(parentRecord()),
    );
    expect(self).toMatchObject({
      objectType: "self",
      query: null,
      reportAvailable: false,
      relation: "",
    });
    const child = buildTalentMemberChildBindingItem(
      sanitizeTalentChildRecord(childRecord()),
    );
    expect(child).toMatchObject({
      objectType: "child",
      query: "found",
      relationLabel: "母亲",
      reportAvailable: false,
    });
  });
});

describe("状态迁移、一孩一家长与归属", () => {
  it("家长 / 子女活跃状态判定", () => {
    expect(isTalentParentActive("1")).toBe(true);
    expect(isTalentParentActive("0")).toBe(false);
    expect(isTalentChildActive("1")).toBe(true);
    expect(isTalentChildActive("2")).toBe(false);
    expect(() =>
      assertTalentChildEditable({ status: "2" }),
    ).toThrow(/已解绑/);
    expect(() => assertTalentChildEditable({ status: "1" })).not.toThrow();
  });

  it("新增子女：未命中建档、已解绑重绑、正常档案 & 停用家长冲突", () => {
    expect(planTalentChildCreate(null, { parentId: "parent_1" })).toEqual({
      action: "create",
    });
    expect(
      planTalentChildCreate(
        { id: "child_1", status: "2", parentId: "" },
        { parentId: "parent_2" },
      ),
    ).toEqual({ action: "rebind", childId: "child_1" });
    expect(() =>
      planTalentChildCreate(
        { id: "child_1", status: "1", parentId: "parent_1" },
        { parentId: "parent_1" },
      ),
    ).toThrow(/已存在/);
    expect(() =>
      planTalentChildCreate(
        { id: "child_1", status: "1", parentId: "parent_1" },
        { parentId: "parent_2", existingParentStatus: "1" },
      ),
    ).toThrow(/已关联其他家长/);
    expect(() =>
      planTalentChildCreate(
        { id: "child_1", status: "1", parentId: "parent_1" },
        { parentId: "parent_2", existingParentStatus: "0" },
      ),
    ).toThrow(/所属家长已停用/);
  });

  it("解绑：保留档案、置空 parentId、状态 2、querySeq + 1 作废在途回执", () => {
    const patch = buildTalentChildUnbindPatch(
      { querySeq: 3 },
      { now: new Date("2026-11-16T02:00:00.000Z"), operatorId: "user_1" },
    );
    expect(patch).toMatchObject({
      parentId: "",
      status: "2",
      querySeq: 4,
      unbindBy: "user_1",
    });
    expect(patch.unbindAt).toBe("2026-11-16 02:00:00.000Z");
  });

  it("编辑子女：仅关键字段变化才重查（关系变更不重查）", () => {
    const current = {
      name: "演示子女一",
      gender: "female" as const,
      birthday: "2016-09-08",
      idNoHash: hashTalentMemberIdNo(ID_NO),
    };
    expect(shouldRequeryTalentChild(current, { relation: "father" })).toBe(false);
    expect(shouldRequeryTalentChild(current, { name: "演示子女二" })).toBe(true);
    expect(shouldRequeryTalentChild(current, { gender: "male" })).toBe(true);
    expect(shouldRequeryTalentChild(current, { birthday: "2016-09-09" })).toBe(
      true,
    );
    expect(
      shouldRequeryTalentChild(current, { idNo: "110101201609081235" }),
    ).toBe(true);
    expect(shouldRequeryTalentChild(current, { idNo: ID_NO })).toBe(false);
  });

  it("归属解析：不存在 / 非本人 / 已解绑 / 家长停用一律 404", () => {
    const parent = { id: "parent_1", status: "1" as const };
    const child = { parentId: "parent_1", status: "1" as const };
    expect(() => assertTalentChildOwnership(parent, child)).not.toThrow();
    for (const [nextParent, nextChild] of [
      [null, child],
      [parent, null],
      [{ id: "parent_2", status: "1" as const }, child],
      [{ id: "parent_1", status: "0" as const }, child],
      [{ id: "parent_1", status: "1" as const }, { parentId: "parent_1", status: "2" as const }],
    ] as const) {
      try {
        assertTalentChildOwnership(nextParent, nextChild);
        throw new Error("应当抛出 404");
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(404);
      }
    }
  });
});

// ── 查询状态机 / 回执守卫 / 节流 / 超时 / Mock ─────────────────────────────────────

function seedQueryFixture(fake: FakePocketBase) {
  const parent = fake.seed("talent_parents", {
    id: "parent_1",
    status: "1",
    mobileCipher: encryptTalentSensitive(MOBILE),
  });
  const child = fake.seed("talent_children", {
    id: "child_1",
    parentId: "parent_1",
    name: "演示子女一",
    gender: "female",
    birthday: "2016-09-08",
    relation: "mother",
    idNoCipher: encryptTalentSensitive(ID_NO),
    query: "unqueried",
    queryReason: "",
    querySeq: 0,
    queryAttempts: 0,
    queryStartedAt: "",
    queryAt: "",
    status: "1",
  });
  return { parent, child };
}

describe("子女查询状态机", () => {
  it("发起查询：先落库 querying（seq + 1），适配器收到明文且不落库", async () => {
    const fake = new FakePocketBase();
    seedQueryFixture(fake);
    useFakePB(fake);
    const requests: Array<Record<string, unknown>> = [];
    const source: TalentGeneQuerySource = {
      source: "fake",
      submit: async (request) => {
        requests.push({ ...request });
        return { accepted: true, externalRef: "ext-1" };
      },
    };
    const now = new Date("2026-11-16T02:00:00.000Z");
    const result = await submitTalentChildQuery("child_1", { source, now });
    expect(result).toMatchObject({ accepted: true, throttled: false });
    expect(result.child).toMatchObject({
      query: "querying",
      querySeq: 1,
      queryAttempts: 1,
      queryReason: "",
    });
    expect(result.child.queryStartedAt).toBe("2026-11-16 02:00:00.000Z");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      childId: "child_1",
      parentId: "parent_1",
      seq: 1,
      idNo: ID_NO,
      mobile: MOBILE,
    });
    // 明文只存在于请求对象，不落任何记录字段。
    expect(JSON.stringify(fake.rows("talent_children"))).not.toContain(ID_NO);
    expect(JSON.stringify(fake.rows("talent_parents"))).not.toContain(MOBILE);
  });

  it("querying 状态重查幂等：不重复发起", async () => {
    const fake = new FakePocketBase();
    seedQueryFixture(fake);
    fake.rows("talent_children")[0]!.query = "querying";
    fake.rows("talent_children")[0]!.querySeq = 1;
    useFakePB(fake);
    let submitted = 0;
    const result = await submitTalentChildQuery("child_1", {
      source: {
        source: "fake",
        submit: async () => {
          submitted += 1;
          return { accepted: true };
        },
      },
    });
    expect(result).toMatchObject({ accepted: false, throttled: true });
    expect(submitted).toBe(0);
  });

  it("30 秒节流：窗口内不重复发起，超窗后允许", async () => {
    const fake = new FakePocketBase();
    seedQueryFixture(fake);
    const child = fake.rows("talent_children")[0]!;
    child.query = "not_found";
    child.queryReason = "info_mismatch";
    child.queryAt = "2026-11-16 02:00:00.000Z";
    useFakePB(fake);
    const now = new Date("2026-11-16T02:00:10.000Z");
    const throttled = await submitTalentChildQuery("child_1", {
      source: { source: "fake", submit: async () => ({ accepted: true }) },
      now,
    });
    expect(throttled).toMatchObject({ accepted: false, throttled: true });
    expect(TALENT_QUERY_MIN_INTERVAL_MS).toBe(30_000);
    const allowed = await submitTalentChildQuery("child_1", {
      source: { source: "fake", submit: async () => ({ accepted: true }) },
      now: new Date(now.getTime() + TALENT_QUERY_MIN_INTERVAL_MS),
    });
    expect(allowed.accepted).toBe(true);
  });

  it("已查到再查 422、已解绑 409、家长停用 409、子女不存在 404", async () => {
    const fake = new FakePocketBase();
    seedQueryFixture(fake);
    const rows = fake.rows("talent_children");
    useFakePB(fake);
    const source = {
      source: "fake",
      submit: async () => ({ accepted: true }),
    } as TalentGeneQuerySource;
    rows[0]!.query = "found";
    await expect(
      submitTalentChildQuery("child_1", { source }),
    ).rejects.toMatchObject({ statusCode: 422 });
    rows[0]!.status = "2";
    await expect(
      submitTalentChildQuery("child_1", { source }),
    ).rejects.toMatchObject({ statusCode: 409 });
    rows[0]!.status = "1";
    fake.rows("talent_parents")[0]!.status = "0";
    await expect(
      submitTalentChildQuery("child_1", { source }),
    ).rejects.toMatchObject({ statusCode: 409 });
    fake.rows("talent_parents")[0]!.status = "1";
    await expect(
      submitTalentChildQuery("child_missing", { source }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("发起即失败：适配器拒绝 / 抛错都置 not_found + api_error", async () => {
    for (const submit of [
      async () => ({ accepted: false }),
      async () => {
        throw new Error("network down");
      },
    ]) {
      const fake = new FakePocketBase();
      seedQueryFixture(fake);
      useFakePB(fake);
      const result = await submitTalentChildQuery("child_1", {
        source: { source: "fake", submit },
        now: new Date("2026-11-16T02:00:00.000Z"),
      });
      expect(result).toMatchObject({ accepted: false, throttled: false });
      expect(result.child).toMatchObject({
        query: "not_found",
        queryReason: "api_error",
        queryStartedAt: "",
        queryAt: "2026-11-16 02:00:00.000Z",
      });
      expect(await markTalentChildQueryFailed("child_1")).toMatchObject({
        query: "not_found",
        queryReason: "api_error",
      });
    }
  });

  it("回执命中：found 清空 reason 与 startedAt，不新建任何记录", async () => {
    const fake = new FakePocketBase();
    seedQueryFixture(fake);
    const child = fake.rows("talent_children")[0]!;
    child.query = "querying";
    child.querySeq = 2;
    child.queryStartedAt = "2026-11-16 02:00:00.000Z";
    useFakePB(fake);
    const outcome = await applyTalentGeneQueryReceipt({
      idempotencyKey: "child_1:2",
      childId: "child_1",
      seq: 2,
      outcome: "found",
      receivedAt: "2026-11-16T02:05:00.000Z",
    });
    expect(outcome).toBe("applied");
    expect(fake.rows("talent_children")[0]).toMatchObject({
      query: "found",
      queryReason: "",
      queryStartedAt: "",
      queryAt: "2026-11-16 02:05:00.000Z",
    });
    expect(fake.createCounts.get("talent_children") || 0).toBe(0);
    expect(fake.createCounts.get("talent_parents") || 0).toBe(0);
    expect(fake.createCounts.get("talent_reports") || 0).toBe(0);
  });

  it("回执 not_found 写入三类归因", async () => {
    for (const reason of ["info_mismatch", "api_error", "no_result"] as const) {
      const fake = new FakePocketBase();
      seedQueryFixture(fake);
      const child = fake.rows("talent_children")[0]!;
      child.query = "querying";
      child.querySeq = 1;
      useFakePB(fake);
      const outcome = await applyTalentGeneQueryReceipt({
        idempotencyKey: "child_1:1",
        childId: "child_1",
        seq: 1,
        outcome: "not_found",
        reason,
        receivedAt: "2026-11-16T02:05:00.000Z",
      });
      expect(outcome).toBe("applied");
      expect(fake.rows("talent_children")[0]!.queryReason).toBe(reason);
    }
  });

  it("迟到 / 无归属 / 已解绑 / 非查询中 / seq 不符 / 幂等键不符的回执全部丢弃", async () => {
    const cases: Array<{
      label: string;
      receipt: TalentGeneQueryReceipt;
      prepare?: (child: FakeRecord) => void;
    }> = [
      {
        label: "未知 childId",
        receipt: {
          idempotencyKey: "ghost:1",
          childId: "ghost",
          seq: 1,
          outcome: "found",
          receivedAt: "2026-11-16T02:05:00.000Z",
        },
      },
      {
        label: "已解绑",
        receipt: {
          idempotencyKey: "child_1:1",
          childId: "child_1",
          seq: 1,
          outcome: "found",
          receivedAt: "2026-11-16T02:05:00.000Z",
        },
        prepare: (child) => {
          child.status = "2";
        },
      },
      {
        label: "状态已变（found）",
        receipt: {
          idempotencyKey: "child_1:1",
          childId: "child_1",
          seq: 1,
          outcome: "not_found",
          reason: "api_error",
          receivedAt: "2026-11-16T02:05:00.000Z",
        },
        prepare: (child) => {
          child.query = "found";
        },
      },
      {
        label: "迟到旧回执（seq 不符）",
        receipt: {
          idempotencyKey: "child_1:1",
          childId: "child_1",
          seq: 1,
          outcome: "found",
          receivedAt: "2026-11-16T02:05:00.000Z",
        },
        prepare: (child) => {
          child.querySeq = 3;
        },
      },
      {
        label: "幂等键与 childId:seq 不符",
        receipt: {
          idempotencyKey: "child_1:99",
          childId: "child_1",
          seq: 1,
          outcome: "found",
          receivedAt: "2026-11-16T02:05:00.000Z",
        },
      },
      {
        label: "not_found 缺少 reason",
        receipt: {
          idempotencyKey: "child_1:1",
          childId: "child_1",
          seq: 1,
          outcome: "not_found",
          receivedAt: "2026-11-16T02:05:00.000Z",
        },
      },
    ];
    for (const testCase of cases) {
      const fake = new FakePocketBase();
      seedQueryFixture(fake);
      const child = fake.rows("talent_children")[0]!;
      child.query = "querying";
      child.querySeq = 1;
      testCase.prepare?.(child);
      useFakePB(fake);
      const outcome = await applyTalentGeneQueryReceipt(testCase.receipt);
      expect(outcome, testCase.label).toBe("discarded");
    }
  });

  it("超时扫描：仅把超过阈值的 querying 转 not_found/api_error", async () => {
    const fake = new FakePocketBase();
    seedQueryFixture(fake);
    useFakePB(fake);
    fake.seed("talent_children", {
      id: "child_timeout",
      parentId: "parent_1",
      query: "querying",
      querySeq: 1,
      queryStartedAt: "2026-11-15 00:00:00.000Z",
      status: "1",
      name: "超时子女",
      gender: "male",
      birthday: "2019-05-20",
      relation: "mother",
      idNoCipher: "aa:bb:cc",
      idNoHash: "d".repeat(64),
      maskedIdNo: "1101**********1234",
      queryAt: "2026-11-15 00:00:00.000Z",
    });
    fake.seed("talent_children", {
      id: "child_recent",
      parentId: "parent_1",
      query: "querying",
      querySeq: 1,
      queryStartedAt: "2026-11-16 01:00:00.000Z",
      status: "1",
      name: "近期子女",
      gender: "male",
      birthday: "2019-05-20",
      relation: "mother",
      idNoCipher: "aa:bb:cc",
      idNoHash: "e".repeat(64),
      maskedIdNo: "1101**********1234",
      queryAt: "2026-11-16 01:00:00.000Z",
    });
    const result = await sweepTalentQueryTimeouts({
      now: new Date("2026-11-16T02:00:00.000Z"),
      timeoutHours: 24,
    });
    expect(result).toEqual({ scanned: 2, converted: 1 });
    expect(fake.find("talent_children", "child_timeout")).toMatchObject({
      query: "not_found",
      queryReason: "api_error",
      queryStartedAt: "",
      queryAt: "2026-11-16 02:00:00.000Z",
    });
    expect(fake.find("talent_children", "child_recent")?.query).toBe("querying");
    // 超时告警写 error_logs（不写手机号 / 证件号）。
    const errorLogs = fake.rows("error_logs");
    expect(errorLogs.length).toBe(1);
    expect(JSON.stringify(errorLogs)).not.toContain(MOBILE);
    expect(JSON.stringify(errorLogs)).not.toContain(ID_NO);
  });

  it("环境变量解析：默认值与非法值回退", () => {
    expect(resolveTalentQueryTimeoutHours({})).toBe(
      TALENT_QUERY_TIMEOUT_HOURS_DEFAULT,
    );
    expect(resolveTalentQueryTimeoutHours({ TALENT_QUERY_TIMEOUT_HOURS: "6" })).toBe(6);
    expect(resolveTalentQueryTimeoutHours({ TALENT_QUERY_TIMEOUT_HOURS: "0" })).toBe(
      TALENT_QUERY_TIMEOUT_HOURS_DEFAULT,
    );
    expect(resolveTalentQuerySweepIntervalMs({})).toBe(600_000);
    expect(resolveTalentQuerySweepIntervalMs({ TALENT_QUERY_SWEEP_INTERVAL_MS: "1000" })).toBe(1000);
    expect(resolveTalentGeneQueryMockDelayMs({})).toBe(1500);
    expect(resolveTalentGeneQueryMockDelayMs({ TALENT_GENE_QUERY_MOCK_DELAY_MS: "0" })).toBe(0);
    expect(resolveTalentGeneQueryMockMode({})).toBe("success");
    expect(
      resolveTalentGeneQueryMockMode({ TALENT_GENE_QUERY_MOCK_MODE: "pending" }),
    ).toBe("pending");
    expect(
      resolveTalentGeneQueryMockMode({ TALENT_GENE_QUERY_MOCK_MODE: "unknown" }),
    ).toBe("success");
  });
});

describe("查询适配器 Mock 五模式", () => {
  const request = {
    childId: "child_1",
    parentId: "parent_1",
    seq: 3,
    name: "演示子女一",
    gender: "female" as const,
    birthday: "2016-09-08",
    idNo: ID_NO,
    mobile: MOBILE,
  };

  it("success → accepted 且回执 found", async () => {
    const receipts: TalentGeneQueryReceipt[] = [];
    const source = createMockTalentGeneQuerySource({
      mode: "success",
      delayMs: 0,
      dispatch: (receipt) => receipts.push(receipt),
    });
    expect(source.source).toBe(TALENT_GENE_QUERY_MOCK_SOURCE);
    const result = await source.submit(request);
    expect(result.accepted).toBe(true);
    await flushTimers();
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      idempotencyKey: "child_1:3",
      childId: "child_1",
      seq: 3,
      outcome: "found",
    });
  });

  it("info_mismatch / no_result → accepted 且回执 not_found + 对应 reason", async () => {
    for (const [mode, reason] of [
      ["info_mismatch", "info_mismatch"],
      ["no_result", "no_result"],
    ] as const) {
      const receipts: TalentGeneQueryReceipt[] = [];
      const source = createMockTalentGeneQuerySource({
        mode,
        delayMs: 0,
        dispatch: (receipt) => receipts.push(receipt),
      });
      expect((await source.submit(request)).accepted).toBe(true);
      await flushTimers();
      expect(receipts[0]).toMatchObject({
        outcome: "not_found",
        reason,
      });
    }
  });

  it("api_error → 发起即失败（accepted=false），不产生回执", async () => {
    const receipts: TalentGeneQueryReceipt[] = [];
    const source = createMockTalentGeneQuerySource({
      mode: "api_error",
      delayMs: 0,
      dispatch: (receipt) => receipts.push(receipt),
    });
    expect(await source.submit(request)).toEqual({ accepted: false });
    await flushTimers();
    expect(receipts).toHaveLength(0);
  });

  it("pending → 受理但不回执（用于超时与迟到回执场景）", async () => {
    const receipts: TalentGeneQueryReceipt[] = [];
    const source = createMockTalentGeneQuerySource({
      mode: "pending",
      delayMs: 0,
      dispatch: (receipt) => receipts.push(receipt),
    });
    expect((await source.submit(request)).accepted).toBe(true);
    await flushTimers();
    expect(receipts).toHaveLength(0);
  });

  it("createTalentGeneQuerySource 读取环境变量且固定 Mock 标识", async () => {
    const source = createTalentGeneQuerySource({
      TALENT_GENE_QUERY_MOCK_MODE: "no_result",
      TALENT_GENE_QUERY_MOCK_DELAY_MS: "0",
    });
    expect(source.source).toBe(TALENT_GENE_QUERY_MOCK_SOURCE);
    expect(await source.submit(request)).toMatchObject({ accepted: true });
  });
});