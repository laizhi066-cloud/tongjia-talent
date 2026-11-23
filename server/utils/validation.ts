/**
 * @description 基础后台 API 的 Zod 校验 schema。
 * @file server/utils/validation.ts
 */
import { z } from 'zod'
import type { H3Event } from 'h3'

/**
 * 统一读取并校验 POST/PUT 请求体。
 * 默认 400；规则域等按 spec 要求 Zod 失败返回 422 的接口可传 `{ statusCode: 422 }`。
 */
export async function validateBody<T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T,
  options: { statusCode?: number } = {},
): Promise<z.infer<T>> {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: options.statusCode ?? 400,
      message: parsed.error.issues[0]?.message || '请求参数不正确',
      data: { issues: parsed.error.issues },
    })
  }
  return parsed.data
}

const status = z.enum(['0', '1'])
const optionalText = (max = 500) => z.string().max(max).optional()

export const createConfigSchema = z.object({ configName: z.string().min(1).max(100), configKey: z.string().min(1).max(100), configValue: z.string().max(50_000), configType: z.string().max(20).default('Y'), remark: optionalText() })
export const updateConfigSchema = createConfigSchema.partial().refine(value => Object.keys(value).length > 0, '至少提交一个字段')

export const createDeptSchema = z.object({ parentId: z.string().nullable().optional(), deptName: z.string().min(1).max(60), orderNum: z.number().int().min(0).optional(), leader: optionalText(60), phone: optionalText(20), email: z.string().email().or(z.literal('')).optional(), status: status.optional() })
export const updateDeptSchema = createDeptSchema.partial().refine(value => Object.keys(value).length > 0, '至少提交一个字段')

export const createMenuSchema = z.object({ parentId: z.string().nullable().optional(), menuType: z.enum(['M', 'C', 'F']), menuName: z.string().min(1).max(60), permissionCode: optionalText(100), path: optionalText(200), component: optionalText(200), icon: optionalText(100), orderNum: z.number().int().min(0).optional(), visible: z.enum(['0', '1']).optional(), status: status.optional() })
export const updateMenuSchema = createMenuSchema.partial().refine(value => Object.keys(value).length > 0, '至少提交一个字段')

export const createPostSchema = z.object({ postCode: z.string().min(1).max(64), postName: z.string().min(1).max(60), postSort: z.number().int().min(0).optional(), status: status.optional(), remark: optionalText() })
export const updatePostSchema = createPostSchema.partial().refine(value => Object.keys(value).length > 0, '至少提交一个字段')

export const createRoleSchema = z.object({ roleName: z.string().min(1).max(60), roleKey: z.string().min(1).max(60), roleSort: z.number().int().min(0).optional(), status: status.optional(), remark: optionalText(), dataScope: z.enum(['1', '2', '3', '4', '5']).optional(), deptScopeIds: z.array(z.string()).max(100).optional() })
export const updateRoleSchema = createRoleSchema.partial().refine(value => Object.keys(value).length > 0, '至少提交一个字段')
export const assignMenuSchema = z.object({ menuIds: z.array(z.string()).max(200) })

export const createDictTypeSchema = z.object({ dictName: z.string().min(1).max(60), dictType: z.string().min(1).max(60), status: status.optional(), remark: optionalText() })
export const updateDictTypeSchema = createDictTypeSchema.partial().refine(value => Object.keys(value).length > 0, '至少提交一个字段')
export const createDictDataSchema = z.object({ dictType: z.string().min(1).max(60), dictLabel: z.string().min(1).max(60), dictValue: z.string().min(1).max(100), dictSort: z.number().int().min(0).optional(), status: status.optional(), cssClass: optionalText(100), listClass: optionalText(100), icon: optionalText(100), backgroundColor: optionalText(50), color: optionalText(50), isDefault: z.enum(['Y', 'N']).optional(), remark: optionalText() })
export const updateDictDataSchema = createDictDataSchema.partial().refine(value => Object.keys(value).length > 0, '至少提交一个字段')

export const updateProfileSchema = z.object({ displayName: z.string().min(1).max(60), nickname: optionalText(60), phone: optionalText(20) })
export const updatePasswordSchema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8) })
export const updateThemeSchema = z.object({
  themeId: z.string().min(1).max(50),
  isDark: z.boolean(),
  primaryColor: z.string().regex(/^#(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/, '品牌主色必须是十六进制颜色').optional(),
})

const wechatCredentialSchema = z.object({
  appId: z.string().trim().max(128),
  appSecret: z.string().trim().max(256),
})

export const updateWechatSettingsSchema = z.object({
  mp: wechatCredentialSchema,
}).superRefine((value, ctx) => {
  if (value.mp.appId && !value.mp.appSecret) {
    ctx.addIssue({
      code: 'custom',
      path: ['mp', 'appSecret'],
      message: '微信小程序 AppSecret 不能为空',
    })
  }
})

export const testWechatSettingsSchema = z.object({}).strict()

export const errorLogStatusSchema = z.object({ status: z.enum(['new', 'resolved', 'ignored']) })
export const errorLogClearSchema = z.object({ status: z.enum(['new', 'resolved', 'ignored', 'all']).optional().default('resolved') })
export const errorMonitorConfigSchema = z.object({ enabled: z.boolean(), ignoreKeywords: z.array(z.string().trim().min(1).max(100)).max(50) })
