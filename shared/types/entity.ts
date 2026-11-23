/**
 * @description 基础版 PocketBase 实体与分页类型。
 * @file shared/types/entity.ts
 */

/** 所有 PocketBase 记录的公共字段。 */
interface RecordEntity {
  id: string
  created: string
  updated: string
}

/** 统一列表响应。 */
export interface PaginatedResponse<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

/** 中性账户；不承载会员、员工或领域身份。 */
export interface UserEntity extends RecordEntity {
  email: string
  displayName: string
  nickname?: string
  avatar?: string
  phone?: string
  /** 已注销账户保留的身份 HMAC；只用于阻断同身份重新自动建户，不向客户端展示。 */
  deletedOpenidHash?: string
  deletedOaOpenidHash?: string
  deletedUnionidHash?: string
  deletedPhoneHash?: string
  gender?: 'male' | 'female' | 'secret' | ''
  birthday?: string
  region?: string
  bio?: string
  status: string
  deptId?: string
  postIds?: string[]
  dept?: Pick<DeptEntity, 'id' | 'deptName'>
  roles?: Array<{ role: Pick<RoleEntity, 'id' | 'roleName' | 'roleKey'> }>
}

/** 后台角色。 */
export interface RoleEntity extends RecordEntity {
  roleName: string
  roleKey: string
  roleSort: number
  dataScope: string
  status: string
  remark?: string
  userCount?: number
  deptIds?: string[]
  menuIds?: string[]
}

/** 后台菜单树节点。 */
export interface MenuEntity extends RecordEntity {
  menuName: string
  menuType: string
  permissionCode?: string
  path?: string
  component?: string
  icon?: string
  orderNum?: number
  visible?: string
  status?: string
  parentId?: string
  children?: MenuEntity[]
}

/** 部门树节点。 */
export interface DeptEntity extends RecordEntity {
  deptName: string
  orderNum?: number
  leader?: string
  phone?: string
  email?: string
  status: string
  parentId?: string
  children?: DeptEntity[]
}

/** 岗位记录。 */
export interface PostEntity extends RecordEntity {
  postCode: string
  postName: string
  postSort: number
  status: string
  remark?: string
}

/** 字典分类。 */
export interface DictTypeEntity extends RecordEntity {
  dictName: string
  dictType: string
  dataCount?: number
  status: string
  remark?: string
}

/** 字典条目；API 使用字典编码而非 PocketBase 关联 ID。 */
export interface DictDataEntity extends RecordEntity {
  dictType: string
  dictLabel: string
  dictValue: string
  dictSort?: number
  cssClass?: string
  listClass?: string
  icon?: string
  backgroundColor?: string
  color?: string
  isDefault?: string
  status: string
  remark?: string
}

/** 通用参数配置。 */
export interface ConfigEntity extends RecordEntity {
  configName: string
  configKey: string
  configValue: string
  configType?: string
  remark?: string
}
