<!--
 * @description 用户角色分配弹窗，加载失败时不保留上一位用户的可提交角色状态。
 * @file app/pages/admin/user/components/UserRoleModal.vue
-->
<script setup lang="ts">
import { NButton, NCheckbox, NEmpty, NModal, NSpin, useMessage } from 'naive-ui'

type UserRoleDetail = UserEntity & { roleIds?: string[] }

const message = useMessage()
const { hasRole } = usePermission()
const show = ref(false)
const loading = ref(false)
const saving = ref(false)
const currentUser = ref<UserEntity | null>(null)
const allRoles = ref<RoleEntity[]>([])
const checkedRoles = ref<Record<string, boolean>>({})
const isSuper = computed(() => hasRole('superadmin'))

const emit = defineEmits<{ saved: [] }>()

/** 清空与用户绑定的异步数据，避免失败或快速切换时串写角色。 */
function resetRoleState(): void {
  allRoles.value = []
  checkedRoles.value = {}
}

function close(): void {
  if (saving.value) return
  show.value = false
}

/**
 * 以当前目标用户为唯一提交来源，加载完成前禁止保存。
 * @param user 后台用户列表中的目标用户
 */
async function open(user: UserEntity): Promise<void> {
  resetRoleState()
  currentUser.value = user
  show.value = true
  loading.value = true

  try {
    const [roles, detail] = await Promise.all([
      useRoleApi().fetchRoles({ pageSize: 100 }),
      useUserApi().getUser(user.id) as Promise<UserRoleDetail>,
    ])
    // 用户在请求期间被切换或关闭时，不允许旧请求覆盖新状态。
    if (currentUser.value?.id !== user.id) return

    // 保留角色的授予与移除都由服务端限制为 superadmin；非超管不展示，避免提交时触发 403。
    allRoles.value = isSuper.value
      ? roles.rows
      : roles.rows.filter(role => !['admin', 'superadmin'].includes(String(role.roleKey || '')))
    const assignedIds = new Set(detail.roleIds || [])
    for (const role of allRoles.value) checkedRoles.value[role.id] = assignedIds.has(role.id)
  } catch {
    if (currentUser.value?.id === user.id) {
      resetRoleState()
      currentUser.value = null
      show.value = false
      message.error('角色信息加载失败，请重试')
    }
  } finally {
    if (currentUser.value?.id === user.id) loading.value = false
  }
}

async function handleSave(): Promise<void> {
  const user = currentUser.value
  if (!user || loading.value || saving.value) return

  saving.value = true
  try {
    const roleIds = Object.entries(checkedRoles.value)
      .filter(([, checked]) => checked)
      .map(([roleId]) => roleId)
    await useUserApi().assignRoles(user.id, roleIds)
    message.success('角色分配成功')
    show.value = false
    emit('saved')
  } catch {
    // 请求拦截器会展示统一的服务端错误；弹窗保持开启，用户可调整后重试。
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <NModal v-model:show="show" preset="card" style="width: min(500px, calc(100vw - 32px))" title="分配角色" :bordered="false" size="small">
    <p class="mb-4 text-sm text-muted-foreground">为用户分配系统角色；一个用户可拥有多个角色。</p>
    <NSpin :show="loading">
      <div v-if="currentUser">
        <p class="mb-3 text-sm text-muted-foreground">
          为用户「{{ currentUser.displayName || currentUser.email }}」分配角色
        </p>
        <div v-if="allRoles.length" class="grid grid-cols-3 gap-2">
          <NCheckbox
            v-for="role in allRoles"
            :key="role.id"
            :checked="checkedRoles[role.id] || false"
            @update:checked="(checked: boolean) => { checkedRoles[role.id] = checked }"
          >
            {{ role.roleName }}
          </NCheckbox>
        </div>
        <NEmpty v-else-if="!loading" description="暂无可分配角色" size="small" />
      </div>
    </NSpin>
    <template #footer>
      <div class="flex justify-end gap-3">
        <NButton :disabled="saving" @click="close">取消</NButton>
        <NButton type="primary" :loading="saving" :disabled="!currentUser || loading" @click="handleSave">保存</NButton>
      </div>
    </template>
  </NModal>
</template>
