/**
 * @description 基础门户站点配置读取与归一化。
 * @file server/utils/site-service.ts
 */
import type PocketBase from 'pocketbase'
import { createError } from 'h3'
import { z } from 'zod'

export type FoundationThemeMode = 'light' | 'dark' | 'system'

export interface FoundationSiteConfig {
  appName: string
  adminName: string
  logo: string
  slogan: string
  copyright: string
  contactPhone: string
  primaryColor: string
  /** 门户默认明暗模式；不改变管理后台的独立亮暗偏好。 */
  themeMode: FoundationThemeMode
}

export const DEFAULT_SITE_CONFIG: FoundationSiteConfig = {
  appName: '同佳天赋', adminName: '同佳天赋管理后台', logo: '/brand/tongjia-talent-lockup.svg', slogan: '看见天赋，陪伴成长',
  copyright: '© 同佳', contactPhone: '', primaryColor: '#2F6F5E', themeMode: 'light',
}

const foundationPrimaryColorSchema = z.string()
  .trim()
  .regex(/^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/, '品牌主色必须是十六进制颜色')

const foundationSiteConfigFields = {
  appName: z.string().trim().min(1).max(100).optional(),
  adminName: z.string().trim().min(1).max(100).optional(),
  logo: z.string().trim().max(500).optional(),
  slogan: z.string().trim().max(200).optional(),
  copyright: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(20).optional(),
  primaryColor: foundationPrimaryColorSchema.optional(),
  themeMode: z.enum(['light', 'dark', 'system']).optional(),
}

/** 新保存的站点配置只接受基础版的三种主题模式。 */
const foundationSiteConfigSchema = z.object(foundationSiteConfigFields).passthrough()

/** 历史数据曾使用 auto；仅在读取/迁移旧记录时兼容。 */
const legacyFoundationSiteConfigSchema = z.object({
  ...foundationSiteConfigFields,
  themeMode: z.enum(['light', 'dark', 'system', 'auto']).optional(),
}).passthrough()

interface SiteConfigRecord {
  id: string
  configValue: string
}

interface SystemThemeRecord {
  id: string
  configValue: string
}

export interface PreparedFoundationSiteConfig {
  configValue: string
  primaryColor: string
}

interface SystemThemeSnapshot {
  id: string
  configValue: string
  created: boolean
}

function parseJsonObject(serialized: string, message: string): Record<string, unknown> {
  try {
    const value = JSON.parse(serialized) as unknown
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      throw new Error('not-object')
    return value as Record<string, unknown>
  }
  catch {
    throw createError({ statusCode: 400, message })
  }
}

/** 解析配置 JSON，并以默认值补齐缺省或不合法字段。 */
function parseSiteConfig(serialized: string): FoundationSiteConfig {
  try {
    const result = legacyFoundationSiteConfigSchema.safeParse(JSON.parse(serialized))
    if (!result.success)
      return { ...DEFAULT_SITE_CONFIG }
    const config = result.data
    return {
      appName: config.appName || DEFAULT_SITE_CONFIG.appName,
      adminName: config.adminName || DEFAULT_SITE_CONFIG.adminName,
      logo: config.logo || DEFAULT_SITE_CONFIG.logo,
      slogan: config.slogan || DEFAULT_SITE_CONFIG.slogan,
      copyright: config.copyright || DEFAULT_SITE_CONFIG.copyright,
      contactPhone: config.contactPhone || DEFAULT_SITE_CONFIG.contactPhone,
      primaryColor: config.primaryColor || DEFAULT_SITE_CONFIG.primaryColor,
      themeMode: config.themeMode === 'auto'
        ? 'system'
        : config.themeMode || DEFAULT_SITE_CONFIG.themeMode,
    }
  } catch {
    return { ...DEFAULT_SITE_CONFIG }
  }
}

/**
 * 校验并标准化新的站点配置写入；历史 auto 不允许再次写入，必须改为 system。
 */
export function prepareFoundationSiteConfigForSave(serialized: string): PreparedFoundationSiteConfig {
  const raw = parseJsonObject(serialized, '站点配置必须是 JSON 对象')
  if (raw.themeMode === 'auto')
    throw createError({ statusCode: 400, message: 'themeMode 仅支持 light、dark 或 system；请将 auto 改为 system' })
  const result = foundationSiteConfigSchema.safeParse(raw)
  if (!result.success)
    throw createError({ statusCode: 400, message: result.error.issues[0]?.message || '站点配置格式不正确' })
  const themeMode = result.data.themeMode || DEFAULT_SITE_CONFIG.themeMode
  const primaryColor = result.data.primaryColor || DEFAULT_SITE_CONFIG.primaryColor
  return { configValue: JSON.stringify({ ...result.data, themeMode, primaryColor }), primaryColor }
}

/**
 * 将存量 auto 配置转为 system 后再保存，避免旧记录被整包默认值覆盖。
 */
export function migrateLegacyFoundationSiteConfigForSave(serialized: string): PreparedFoundationSiteConfig {
  const raw = parseJsonObject(serialized, '现有站点配置不是 JSON 对象')
  if (raw.themeMode === 'auto') raw.themeMode = 'system'
  return prepareFoundationSiteConfigForSave(JSON.stringify(raw))
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 404
}

function parseSystemThemeValue(serialized: string): Record<string, unknown> {
  try {
    const value = JSON.parse(serialized) as unknown
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}
  }
  catch {
    return {}
  }
}

/**
 * 将唯一站点的品牌主色同步到后台主题，同时保留后台选定的皮肤与亮暗模式。
 * 返回快照，供随后 site_config 写入失败时补偿恢复。
 */
async function applySitePrimaryColor(pb: PocketBase, primaryColor: string): Promise<SystemThemeSnapshot> {
  const configs = pb.collection('configs')
  let existing: SystemThemeRecord | null = null
  try {
    existing = await configs.getFirstListItem<SystemThemeRecord>('configKey = "system_theme"', { $autoCancel: false })
  }
  catch (error) {
    if (!isNotFound(error)) throw error
  }

  const current = parseSystemThemeValue(existing?.configValue || '{}')
  const configValue = JSON.stringify({
    ...current,
    themeId: typeof current.themeId === 'string' && current.themeId ? current.themeId : 'emerald',
    // 亮/暗模式是后台自己的显示偏好，不能被 C 端默认外观覆盖。
    isDark: current.isDark === true,
    primaryColor,
  })

  if (existing) {
    await configs.update(existing.id, { configValue }, { $autoCancel: false })
    return { id: existing.id, configValue: existing.configValue, created: false }
  }

  const created = await configs.create({
    configName: '系统主题',
    configKey: 'system_theme',
    configValue,
    configType: 'Y',
    remark: '由站点品牌主色同步；后台亮暗模式独立保存',
  }, { $autoCancel: false })
  return { id: created.id, configValue: '', created: true }
}

async function restoreSystemTheme(pb: PocketBase, snapshot: SystemThemeSnapshot): Promise<void> {
  const configs = pb.collection('configs')
  if (snapshot.created) {
    await configs.delete(snapshot.id, { $autoCancel: false })
    return
  }
  await configs.update(snapshot.id, { configValue: snapshot.configValue }, { $autoCancel: false })
}

/**
 * 安全地保存 site_config：先同步品牌主色，若站点记录写入失败则补偿恢复主题快照。
 * PocketBase REST 没有跨集合事务，因此用此补偿保证不会留下单边的成功写入。
 */
export async function saveFoundationSiteConfig<T>(
  pb: PocketBase,
  serialized: string,
  writeSiteConfig: (configValue: string) => Promise<T>,
): Promise<T> {
  const prepared = prepareFoundationSiteConfigForSave(serialized)
  const snapshot = await applySitePrimaryColor(pb, prepared.primaryColor)
  try {
    return await writeSiteConfig(prepared.configValue)
  }
  catch (error) {
    await restoreSystemTheme(pb, snapshot).catch((restoreError: unknown) => {
      console.error('[site-theme] 回滚 system_theme 失败:', restoreError)
    })
    throw error
  }
}

/**
 * 将后台皮肤选择产生的品牌主色回写唯一站点配置，保证 B/C 只共享主色而不共享明暗模式。
 * @param pb 单实例 PocketBase 管理客户端
 * @param primaryColor 已通过主题接口校验的十六进制主色
 */
export async function synchronizeFoundationSitePrimaryColor(pb: PocketBase, primaryColor: string): Promise<void> {
  const configs = pb.collection('configs')
  let existing: SiteConfigRecord | null = null
  try {
    existing = await configs.getFirstListItem<SiteConfigRecord>('configKey = "site_config"', { $autoCancel: false })
  }
  catch (error) {
    if (!isNotFound(error)) throw error
  }

  if (!existing) {
    const prepared = prepareFoundationSiteConfigForSave(JSON.stringify({ ...DEFAULT_SITE_CONFIG, primaryColor }))
    await configs.create({
      configName: '基础站点配置',
      configKey: 'site_config',
      configValue: prepared.configValue,
      configType: 'Y',
      remark: '唯一站点的公开品牌配置',
    }, { $autoCancel: false })
    return
  }

  // 保留现有基础配置与未来的兼容字段，仅规范化已淘汰的 auto。
  const raw = parseJsonObject(existing.configValue, '现有站点配置不是 JSON 对象')
  if (raw.themeMode === 'auto') raw.themeMode = 'system'
  raw.primaryColor = primaryColor
  const prepared = prepareFoundationSiteConfigForSave(JSON.stringify(raw))
  await configs.update(existing.id, { configValue: prepared.configValue }, { $autoCancel: false })
}

/** 读取唯一站点的品牌与门户配置；缺失记录时返回可用默认值。 */
export async function getSiteConfig(pb: PocketBase): Promise<FoundationSiteConfig> {
  const record = await pb.collection('configs').getFirstListItem<SiteConfigRecord>('configKey = "site_config"', { $autoCancel: false }).catch(() => null)
  if (!record) return { ...DEFAULT_SITE_CONFIG }
  return parseSiteConfig(record.configValue)
}
