/**
 * @description M1 规则域 CSV 测试：固定注解 / 分级解析、表头别名、失败行与重复行、
 *   模板与导出的 BOM / 转义，以及 10MB 上限。
 * @file test/talent-rule-csv.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  assertTalentRuleImportFileSize,
  buildTalentFactorNoteCsv,
  buildTalentFactorNoteImportRecord,
  buildTalentFactorNoteCsvTemplate,
  buildTalentLevelCsv,
  buildTalentLevelCsvTemplate,
  buildTalentLevelImportRecord,
  parseTalentFactorNoteCsv,
  parseTalentLevelCsv,
  TALENT_FACTOR_NOTE_CSV_COLUMNS,
  TALENT_LEVEL_CSV_COLUMNS,
  TALENT_RULE_IMPORT_MAX_BYTES,
} from "~~/server/utils/talent-rule-csv";

const NOTE_CONTEXT = {
  factorCategories: new Map([
    ["A-01", "A"],
    ["A-02", "A"],
  ]),
  enabledLevelCodes: new Set(["LV1", "LV2", "LV3", "LV4"]),
  existingNoteCodes: new Set(["A-01-LV1"]),
};

const LEVEL_CONTEXT = { existingLevelCodes: new Set(["LV1"]) };

describe("固定注解 CSV 预览", () => {
  it("解析 BOM、引号与字段内逗号，并识别中文表头别名", () => {
    const csv =
      "\uFEFF要素编码,分级编码,注解正文,年龄条件,性别条件,启用状态\r\n" +
      'A-01,LV1,"表现稳定，建议持续观察",0 岁,男,启用\r\n';
    const preview = parseTalentFactorNoteCsv(csv, NOTE_CONTEXT);
    expect(preview).toMatchObject({ total: 1, passed: 1, failed: 0 });
    expect(preview.rows[0]).toMatchObject({
      rowNumber: 2,
      code: "A-01-LV1",
      factorCode: "A-01",
      levelCode: "LV1",
      note: "表现稳定，建议持续观察",
      ageRange: "0 岁",
      gender: "男",
      status: "1",
      ok: true,
    });
    // 已存在同编号时提示覆盖，而不是失败。
    expect(preview.rows[0]?.warnings.join(" ")).toContain("导入将覆盖");
  });

  it("1 行通过 + 1 行失败：失败行不进入 passed 且带行号原因", () => {
    const csv =
      "注解编号,要素编码,分级编码,注解正文,年龄条件,性别条件,启用状态\n" +
      "A-01-LV1,A-01,LV1,合法正文,0 岁,通用,1\n" +
      "Z-99-LV1,Z-99,LV1,要素不存在,0 岁,通用,1\n";
    const preview = parseTalentFactorNoteCsv(csv, NOTE_CONTEXT);
    expect(preview).toMatchObject({ total: 2, passed: 1, failed: 1 });
    const failed = preview.rows[1];
    expect(failed?.rowNumber).toBe(3);
    expect(failed?.ok).toBe(false);
    expect(failed?.errors.join(" ")).toContain("要素编码不存在");
    expect(preview.rows.filter((row) => row.ok).map((row) => row.factorCode)).toEqual(["A-01"]);
  });

  it("缺少正文、分级停用、非法性别 / 状态均失败", () => {
    const csv =
      "要素编码,分级编码,注解正文,性别条件,启用状态\n" +
      "A-01,LV1,,通用,1\n" +
      "A-02,LV4,正文,未知,2\n";
    const preview = parseTalentFactorNoteCsv(csv, NOTE_CONTEXT);
    expect(preview.failed).toBe(2);
    expect(preview.rows[0]?.errors.join(" ")).toContain("注解正文不能为空");
    expect(preview.rows[1]?.errors.join(" ")).toContain("性别条件");
    expect(preview.rows[1]?.errors.join(" ")).toContain("启用状态");
    const disabledLevel = parseTalentFactorNoteCsv(
      "要素编码,分级编码,注解正文\nA-01,LV4,正文",
      { ...NOTE_CONTEXT, enabledLevelCodes: new Set(["LV1"]) },
    );
    expect(disabledLevel.rows[0]?.errors.join(" ")).toContain("分级不存在或已停用");
  });

  it("同文件重复键：后行覆盖前行并在预览标注", () => {
    const csv =
      "要素编码,分级编码,注解正文\n" +
      "A-01,LV1,第一行\n" +
      "A-01,LV2,不重复\n" +
      "A-01,LV1,第二行\n";
    const preview = parseTalentFactorNoteCsv(csv);
    expect(preview.total).toBe(3);
    expect(preview.rows[0]?.warnings.join(" ")).toContain("第 4 行将覆盖本行");
    expect(preview.rows[2]?.warnings).toEqual([]);
  });

  it("注解编号与派生值不一致时仅提示忽略", () => {
    const csv = "注解编号,要素编码,分级编码,注解正文\nOTHER-CODE,A-01,LV2,正文";
    const preview = parseTalentFactorNoteCsv(csv);
    expect(preview.passed).toBe(1);
    expect(preview.rows[0]?.warnings.join(" ")).toContain("已忽略文件值");
  });

  it("缺少必填列 / 无数据行 / 空表头返回 422", () => {
    expect(() => parseTalentFactorNoteCsv("要素编码,注解正文\nA-01,正文")).toThrow(
      "缺少必填列：levelCode",
    );
    expect(() => parseTalentFactorNoteCsv("要素编码,分级编码,注解正文")).toThrow(
      "至少需要表头和一行数据",
    );
    expect(() =>
      parseTalentFactorNoteCsv("要素编码,分级编码,注解正文\nA-01,,正文"),
    ).not.toThrow();
    expect(() => parseTalentFactorNoteCsv("要素编码,要素编码,注解正文\nA-01,A-02,正文")).toThrow(
      "表头不能重复",
    );
  });

  it("预览行可转换为落库记录", () => {
    const preview = parseTalentFactorNoteCsv(
      "要素编码,分级编码,注解正文,年龄条件,性别条件,启用状态\nA-01,LV2,正文,3–6 岁,女,停用",
    );
    const record = buildTalentFactorNoteImportRecord(preview.rows[0]!, "A");
    expect(record).toEqual({
      code: "A-01-LV2",
      factorCode: "A-01",
      category: "A",
      levelCode: "LV2",
      note: "正文",
      ageRange: "3–6 岁",
      gender: "女",
      status: "0",
    });
  });
});

describe("分级 CSV 预览", () => {
  it("合法行通过，非法编码 / 级序 / 色位 / 状态失败", () => {
    const csv =
      "分级编码,分级名称,级序,得分范围,展示色位,启用状态\n" +
      "LV1,常态,1,0–59,default,启用\n" +
      "X1,坏编码,5,未定,red,2\n";
    const preview = parseTalentLevelCsv(csv, LEVEL_CONTEXT);
    expect(preview).toMatchObject({ total: 2, passed: 1, failed: 1 });
    expect(preview.rows[0]).toMatchObject({
      code: "LV1",
      name: "常态",
      sortOrder: 1,
      tone: "default",
      status: "1",
      ok: true,
    });
    expect(preview.rows[0]?.warnings.join(" ")).toContain("导入将更新");
    const errors = preview.rows[1]?.errors.join(" ") || "";
    expect(errors).toContain("分级编码格式");
    expect(errors).toContain("级序必须是 1–4");
    expect(errors).toContain("展示色位");
    expect(errors).toContain("启用状态");
  });

  it("同文件重复分级编码：后行覆盖前行", () => {
    const csv =
      "分级编码,分级名称,级序\nLV2,优良,2\nLV2,优良（覆盖）,2\n";
    const preview = parseTalentLevelCsv(csv);
    expect(preview.rows[0]?.warnings.join(" ")).toContain("第 3 行将覆盖本行");
  });

  it("缺少必填列返回 422", () => {
    expect(() => parseTalentLevelCsv("分级编码,分级名称\nLV1,常态")).toThrow(
      "缺少必填列：sortOrder",
    );
  });

  it("预览行可转换为落库记录并镜像旧字段", () => {
    const preview = parseTalentLevelCsv("分级编码,分级名称,级序,得分范围,展示色位\nLV2,优良,2,60–74,info");
    const record = buildTalentLevelImportRecord(preview.rows[0]!);
    expect(record).toEqual({
      code: "LV2",
      name: "优良",
      sortOrder: 2,
      range: "60–74",
      tone: "info",
      status: "1",
      levelCode: "LV2",
      levelName: "优良",
    });
  });
});

describe("模板与导出", () => {
  it("模板带 BOM、固定表头与 1 行示例", () => {
    const noteTemplate = buildTalentFactorNoteCsvTemplate();
    expect(noteTemplate.startsWith("\uFEFF")).toBe(true);
    const noteLines = noteTemplate.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(noteLines[0]).toBe(TALENT_FACTOR_NOTE_CSV_COLUMNS.join(","));
    expect(noteLines).toHaveLength(2);
    expect(noteLines[1]).toContain("A-01-LV1");

    const levelTemplate = buildTalentLevelCsvTemplate();
    expect(levelTemplate.startsWith("\uFEFF")).toBe(true);
    const levelLines = levelTemplate.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(levelLines[0]).toBe(TALENT_LEVEL_CSV_COLUMNS.join(","));
    expect(levelLines).toHaveLength(2);
    expect(levelLines[1]).toContain("LV1,常态,1");
  });

  it("导出对逗号、引号与换行做 CSV 转义", () => {
    const csv = buildTalentFactorNoteCsv([
      {
        rowNumber: 2,
        code: "A-01-LV1",
        factorCode: "A-01",
        levelCode: "LV1",
        note: '含"引号",与逗号\n换行',
        ageRange: "",
        gender: "通用",
        status: "1",
        ok: true,
        errors: [],
        warnings: [],
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"含""引号"",与逗号\n换行"');
    const levelCsv = buildTalentLevelCsv([
      {
        rowNumber: 2,
        code: "LV1",
        name: "常态",
        sortOrder: 1,
        range: "0–59",
        tone: "default",
        status: "1",
        ok: true,
        errors: [],
        warnings: [],
      },
    ]);
    expect(levelCsv.split("\r\n")[1]).toBe("LV1,常态,1,0–59,default,1");
  });

  it("拒绝超过 10MB 的规则域导入文件", () => {
    expect(() =>
      assertTalentRuleImportFileSize(new Uint8Array(TALENT_RULE_IMPORT_MAX_BYTES + 1)),
    ).toThrow("导入文件不能超过 10MB");
    expect(() =>
      assertTalentRuleImportFileSize(new Uint8Array(TALENT_RULE_IMPORT_MAX_BYTES)),
    ).not.toThrow();
  });
});