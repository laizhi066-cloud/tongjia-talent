<!--
 * @description C 端生命周期入口：恢复本地会话、加载唯一站点主题、安装会话失效/停用守卫。
 * @file src/App.vue
-->
<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { installSessionGuard } from '@/modules/foundation-portal/composables/useSessionGuard'
import { useAuthStore } from '@/store/auth'
import { useSiteStore } from '@/store/site'

const siteStore = useSiteStore()

/** 前台门户定期拉取极小的公开配置，后台改色/改品牌后无需手动刷新。 */
const SITE_CONFIG_SYNC_INTERVAL_MS = 10_000
let siteConfigSyncTimer: ReturnType<typeof setInterval> | undefined

/** 在门户位于前台时启动一次定期配置同步；重复调用不会创建额外定时器。 */
function startSiteConfigSync(): void {
  if (siteConfigSyncTimer)
    return
  siteConfigSyncTimer = setInterval(() => {
    void siteStore.loadSite()
  }, SITE_CONFIG_SYNC_INTERVAL_MS)
}

/** 页面隐藏时回收定时器，避免后台应用继续请求公开配置。 */
function stopSiteConfigSync(): void {
  if (!siteConfigSyncTimer)
    return
  clearInterval(siteConfigSyncTimer)
  siteConfigSyncTimer = undefined
}

/** 首次启动恢复本地登录态、加载站点主题并安装会话守卫。 */
onLaunch((): void => {
  useAuthStore().restore()
  installSessionGuard()
  void siteStore.loadSite()
  startSiteConfigSync()
})

/** 从后台回到前台时刷新品牌配置，便于配置更新后即时生效。 */
onShow((): void => {
  void siteStore.loadSite()
  startSiteConfigSync()
})

/** 页面进入后台后暂停同步，避免隐藏应用持续请求公开配置。 */
onHide((): void => {
  stopSiteConfigSync()
})
</script>
