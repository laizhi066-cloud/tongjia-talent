/**
 * @description 验证站点品牌主色与后台主题同步，同时保持两端亮暗模式独立。
 * @file test/foundation-site-theme-sync.test.ts
 */
import type PocketBase from "pocketbase";
import { describe, expect, it } from "vitest";
import {
  getSiteConfig,
  migrateLegacyFoundationSiteConfigForSave,
  prepareFoundationSiteConfigForSave,
  saveFoundationSiteConfig,
  synchronizeFoundationSitePrimaryColor,
} from "../server/utils/site-service";
import { buildNaiveOverrides } from "../app/config/naive-theme";
import { getFoundationThemePrimaryColor } from "../app/composables/useTheme";
import {
  getReadableForeground,
  normalizeHexColor,
} from "../app/utils/color-contrast";

interface ConfigRecord {
  id: string;
  configName: string;
  configKey: string;
  configValue: string;
  configType?: string;
  remark?: string;
}

class ConfigCollection {
  private nextId = 1;
  readonly records = new Map<string, ConfigRecord>();

  constructor(records: ConfigRecord[]) {
    for (const record of records)
      this.records.set(record.configKey, { ...record });
  }

  async getFirstListItem<T>(filter: string): Promise<T> {
    const key = filter.match(/configKey = "([^"\\]+)"/)?.[1] || "";
    const record = this.records.get(key);
    if (!record) throw { status: 404 };
    return { ...record } as T;
  }

  async create(input: Omit<ConfigRecord, "id">): Promise<ConfigRecord> {
    const record = { ...input, id: `config-${this.nextId++}` };
    this.records.set(record.configKey, record);
    return { ...record };
  }

  async update(
    id: string,
    input: Partial<ConfigRecord>,
  ): Promise<ConfigRecord> {
    const current = [...this.records.values()].find(
      (record) => record.id === id,
    );
    if (!current) throw { status: 404 };
    const next = { ...current, ...input };
    if (next.configKey !== current.configKey)
      this.records.delete(current.configKey);
    this.records.set(next.configKey, next);
    return { ...next };
  }

  async delete(id: string): Promise<boolean> {
    const record = [...this.records.values()].find((value) => value.id === id);
    if (!record) throw { status: 404 };
    this.records.delete(record.configKey);
    return true;
  }
}

function createPb(records: ConfigRecord[]) {
  const configs = new ConfigCollection(records);
  return {
    configs,
    pb: { collection: () => configs } as unknown as PocketBase,
  };
}

function siteConfig(
  themeMode: "light" | "dark" | "system" | "auto",
  primaryColor?: string,
): string {
  return JSON.stringify({
    appName: "基础门户",
    themeMode,
    ...(primaryColor ? { primaryColor } : {}),
  });
}

describe("foundation site theme synchronization", () => {
  it("规范化短十六进制主色，并为任意亮暗品牌色提供可读前景", () => {
    expect(normalizeHexColor("#fAc")).toBe("#ffaacc");
    expect(getReadableForeground("#facc15")).toBe("#000000");
    expect(getReadableForeground("#777777")).toBe("#000000");
    expect(getReadableForeground("#172554")).toBe("#ffffff");

    const overrides = buildNaiveOverrides("sky", false, "#fac");
    expect(overrides.common?.primaryColor).toBe("#ffaacc");
    expect(overrides.common?.primaryColorHover).toBe("#ffc3db");
    expect(overrides.common?.primaryColorPressed).toBe("#f09bc2");
    expect(overrides.Button?.textColorPrimary).toBe("#000000");
    expect(overrides.Button?.colorHoverPrimary).toBe("#ffc3db");
    expect(overrides.Button?.colorPressedPrimary).toBe("#f09bc2");
    expect(overrides.Pagination?.itemTextColorActive).toBe("#000000");
  });

  it("皮肤的跨端主色固定取亮色版本，后台切换亮暗不会改变门户品牌色", () => {
    expect(getFoundationThemePrimaryColor("sky")).toBe("#1c69e3");
    expect(getFoundationThemePrimaryColor("not-found")).toBe("");
  });

  it("读取历史 auto 时只映射为 system，不会整包回退默认值", async () => {
    const { pb } = createPb([
      {
        id: "site",
        configName: "站点",
        configKey: "site_config",
        configValue: siteConfig("auto"),
      },
    ]);

    await expect(getSiteConfig(pb)).resolves.toMatchObject({
      appName: "基础门户",
      themeMode: "system",
    });
  });

  it("拒绝将 legacy auto 作为新的保存值", () => {
    expect(() =>
      prepareFoundationSiteConfigForSave(siteConfig("auto")),
    ).toThrow(/themeMode 仅支持 light、dark 或 system/);
  });

  it("迁移存量 auto 时保留现有字段并将主题模式重写为 system", () => {
    const migrated = migrateLegacyFoundationSiteConfigForSave(
      siteConfig("auto"),
    );
    expect(JSON.parse(migrated.configValue)).toMatchObject({
      appName: "基础门户",
      themeMode: "system",
    });
  });

  it.each([
    ["light", true],
    ["dark", false],
    ["system", true],
  ] as const)(
    "保存门户 %s 默认外观时保留后台 isDark=%s",
    async (themeMode, currentDark) => {
      const { configs, pb } = createPb([
        {
          id: "theme",
          configName: "系统主题",
          configKey: "system_theme",
          configValue: JSON.stringify({
            themeId: "violet",
            isDark: currentDark,
          }),
        },
      ]);

      await saveFoundationSiteConfig(
        pb,
        siteConfig(themeMode),
        async (configValue) => ({ configValue }),
      );

      expect(
        JSON.parse(configs.records.get("system_theme")!.configValue),
      ).toEqual({
        themeId: "violet",
        isDark: currentDark,
        primaryColor: "#2F6F5E",
      });
    },
  );

  it("保存站点主色时同步后台主题色但不改变后台明暗模式", async () => {
    const { configs, pb } = createPb([
      {
        id: "theme",
        configName: "系统主题",
        configKey: "system_theme",
        configValue: JSON.stringify({ themeId: "emerald", isDark: true }),
      },
    ]);

    await saveFoundationSiteConfig(
      pb,
      siteConfig("light", "#3287ff"),
      async (configValue) => ({ configValue }),
    );

    expect(
      JSON.parse(configs.records.get("system_theme")!.configValue),
    ).toEqual({
      themeId: "emerald",
      isDark: true,
      primaryColor: "#3287ff",
    });
  });

  it("后台皮肤主色同步到门户配置且不改变门户默认外观", async () => {
    const { configs, pb } = createPb([
      {
        id: "site",
        configName: "站点",
        configKey: "site_config",
        configValue: JSON.stringify({
          appName: "基础门户",
          themeMode: "dark",
          primaryColor: "#2F6F5E",
        }),
      },
    ]);

    await synchronizeFoundationSitePrimaryColor(pb, "#3287ff");

    expect(
      JSON.parse(configs.records.get("site_config")!.configValue),
    ).toMatchObject({
      appName: "基础门户",
      themeMode: "dark",
      primaryColor: "#3287ff",
    });
  });

  it("site_config 写入失败时恢复原来的 system_theme 快照", async () => {
    const original = JSON.stringify({ themeId: "emerald", isDark: false });
    const { configs, pb } = createPb([
      {
        id: "theme",
        configName: "系统主题",
        configKey: "system_theme",
        configValue: original,
      },
    ]);

    await expect(
      saveFoundationSiteConfig(pb, siteConfig("dark"), async () => {
        throw new Error("site write failed");
      }),
    ).rejects.toThrow("site write failed");

    expect(configs.records.get("system_theme")!.configValue).toBe(original);
  });

  it("尚无后台主题记录时创建稳定的亮色配置并同步默认主色", async () => {
    const { configs, pb } = createPb([]);

    await saveFoundationSiteConfig(
      pb,
      siteConfig("system"),
      async (configValue) => ({ configValue }),
    );

    expect(
      JSON.parse(configs.records.get("system_theme")!.configValue),
    ).toMatchObject({ isDark: false, primaryColor: "#2F6F5E" });
  });
});
