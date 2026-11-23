/**
 * @description v-permission 指令 — 按钮级别的权限控制
 * @file app/plugins/permission.ts
 *
 * 使用方式：
 *   <Button v-permission="'system:user:add'">新增用户</Button>
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('permission', {
    mounted(el: HTMLElement, binding) {
      const { hasPermission } = usePermission()
      if (!hasPermission(binding.value)) {
        el.parentNode?.removeChild(el)
      }
    },
  })
})
