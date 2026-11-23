/**
 * @description C 端资料接口的头像引用判定；头像二进制只能经受控上传接口写入。
 * @file server/utils/profile-avatar.ts
 */
export type ProfileAvatarAction = 'keep' | 'clear' | 'reject'

/**
 * 解析资料接口中 avatar 字段的安全语义。
 *
 * C 端保存其他资料时会回传 GET /profile 返回的既有文件 URL，此场景只保留原头像。
 * 任何新的非空字符串（尤其是远程 URL）都必须改走 /api/upload，避免服务端代为下载。
 */
export function resolveProfileAvatarAction(
  requestedAvatar: string | undefined,
  currentAvatarUrl: string,
): ProfileAvatarAction {
  if (requestedAvatar === undefined || requestedAvatar === currentAvatarUrl) return 'keep'
  return requestedAvatar === '' ? 'clear' : 'reject'
}
