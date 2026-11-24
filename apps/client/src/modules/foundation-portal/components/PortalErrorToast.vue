<!--
 * @description 全局 API 异常通知的 Wot UI Toast 挂载宿主。
 *   每个页面通过 PortalTabbar（4 主栏）或 PortalNavBar（二级页）挂载一次，
 *   使用实例唯一 selector 绑定 `<wd-toast />` 并接入 `error-notification` 派发栈，
 *   确保多页面栈与 H5 / 微信小程序环境下均在当前可见页展示 Wot UI 错误提示。
 * @file src/modules/foundation-portal/components/PortalErrorToast.vue
-->
<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useToast } from '@wot-ui/ui'
import { onMounted, onUnmounted } from 'vue'
import {
  activateErrorToastHandler,
  allocateErrorToastSelector,
  registerErrorToastHandler,
  unregisterErrorToastHandler,
} from '@/http/error-notification'
import type { ApiErrorNotification } from '@/http/error-notification'

const toastHostId = allocateErrorToastSelector()
const toast = useToast(toastHostId)

/** 将拦截器派发的异常通知渲染为 Wot UI 错误 Toast。 */
function showErrorToast(notification: ApiErrorNotification): void {
  toast.error({
    msg: notification.message,
    duration: notification.duration,
    position: 'middle',
  })
}

onMounted(() => {
  registerErrorToastHandler(showErrorToast)
})

onShow(() => {
  activateErrorToastHandler(showErrorToast)
})

onUnmounted(() => {
  unregisterErrorToastHandler(showErrorToast)
})
</script>

<template>
  <wd-toast :selector="toastHostId" />
</template>
