<!--
/**
 * @description Vue 运行时错误边界组件 — 捕获子组件树渲染与交互异常，记录日志并上报监控，展示友好可恢复界面。
 * @file app/components/AppErrorBoundary.vue
 */
-->
<script setup lang="ts">
import AlertCircleOutline from '@vicons/ionicons5/es/AlertCircleOutline'
import ChevronDownOutline from '@vicons/ionicons5/es/ChevronDownOutline'
import ChevronUpOutline from '@vicons/ionicons5/es/ChevronUpOutline'
import CopyOutline from '@vicons/ionicons5/es/CopyOutline'
import HomeOutline from '@vicons/ionicons5/es/HomeOutline'
import RefreshOutline from '@vicons/ionicons5/es/RefreshOutline'
import ReloadOutline from '@vicons/ionicons5/es/ReloadOutline'
import CheckmarkOutline from '@vicons/ionicons5/es/CheckmarkOutline'
import { darkTheme, NButton, NConfigProvider, NIcon, zhCN } from 'naive-ui'
import { computed, onErrorCaptured, onUnmounted, ref, watch } from 'vue'
import { buildNaiveOverrides } from '~/config/naive-theme'
import {
  buildClientErrorPayload,
  extractComponentName,
  formatDiagnosticReport,
  getRecoveryCopy,
  normalizeCapturedError,
  type CapturedBoundaryError,
} from '~/utils/error-boundary'

const props = withDefaults(defineProps<{
  /** 内嵌于工作区容器（如 admin 布局内容区）时开启，保留侧栏与顶栏可用 */
  contained?: boolean
  /** 「返回工作台 / 首页」跳转路径 */
  homePath?: string
  /** 路由变化时自动重置错误状态 */
  resetOnRouteChange?: boolean
  /** 可选自定义错误回调 */
  onError?: (captured: CapturedBoundaryError, rawError: unknown) => void
}>(), {
  contained: false,
  homePath: '/admin/talent/dashboard',
  resetOnRouteChange: true,
  onError: undefined,
})

const emit = defineEmits<{
  error: [captured: CapturedBoundaryError, rawError: unknown]
  recover: [action: 'retry' | 'home' | 'route-change']
}>()

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { isDark, currentThemeId, primaryColor } = useTheme()
const naiveOverrides = computed(() =>
  buildNaiveOverrides(currentThemeId.value, isDark.value, primaryColor.value),
)

const capturedError = ref<CapturedBoundaryError | null>(null)
const retryKey = ref(0)
const retryCount = ref(0)
const showDetails = ref(false)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const recoveryCopy = computed(() =>
  capturedError.value ? getRecoveryCopy(capturedError.value, retryCount.value) : null,
)

const diagnosticText = computed(() =>
  capturedError.value ? formatDiagnosticReport(capturedError.value) : '',
)

const isPublicAuthRoute = computed(() => route.path === '/login' || route.path === '/')
const homeActionLabel = computed(() => (isPublicAuthRoute.value ? '返回登录页' : '返回工作台'))
const resolvedHomePath = computed(() => (isPublicAuthRoute.value ? '/login' : props.homePath))

function reportToServer(captured: CapturedBoundaryError): void {
  if (!import.meta.client)
    return
  try {
    const baseURL = runtimeConfig.app.baseURL || '/'
    const endpoint = new URL(
      `${baseURL.replace(/\/+$/, '')}/api/client/client-error`,
      window.location.origin,
    ).toString()
    const payload = buildClientErrorPayload(captured, window.navigator.userAgent)
    const body = JSON.stringify(payload)
    const sent = window.navigator.sendBeacon?.(
      endpoint,
      new Blob([body], { type: 'application/json' }),
    )
    if (!sent) {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }
  catch {
    // 监控上报失败绝不能影响错误恢复界面本身
  }
}

function captureError(err: unknown, instance: unknown = null, info = 'runtime'): CapturedBoundaryError {
  const path = import.meta.client
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : route.fullPath || '/'

  const normalized = normalizeCapturedError(err, {
    componentName: extractComponentName(instance),
    lifecycleInfo: info,
    path,
  })

  capturedError.value = normalized
  showDetails.value = false
  copied.value = false

  console.error(
    `[AppErrorBoundary][${normalized.id}]`,
    `${normalized.componentName} (${normalized.lifecycleInfo}):`,
    err,
  )

  reportToServer(normalized)
  props.onError?.(normalized, err)
  emit('error', normalized, err)

  return normalized
}

function resetError(action: 'retry' | 'home' | 'route-change' = 'retry'): void {
  if (action === 'retry') {
    retryCount.value += 1
  }
  else {
    retryCount.value = 0
  }
  capturedError.value = null
  showDetails.value = false
  copied.value = false
  retryKey.value += 1
  emit('recover', action)
}

function handleRetry(): void {
  resetError('retry')
}

function handleReload(): void {
  if (import.meta.client) {
    window.location.reload()
  }
}

async function handleGoHome(): Promise<void> {
  const target = resolvedHomePath.value
  resetError('home')
  if (route.path !== target) {
    await navigateTo(target)
  }
}

async function handleCopyDetails(): Promise<void> {
  if (!import.meta.client || !diagnosticText.value)
    return
  let success = false
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(diagnosticText.value)
      success = true
    }
    catch {
      success = false
    }
  }
  if (!success) {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = diagnosticText.value
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      success = document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    catch {
      success = false
    }
  }
  copied.value = success
  if (success) {
    if (copyTimer)
      clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
      copyTimer = null
    }, 2200)
  }
}

onErrorCaptured((err, instance, info) => {
  captureError(err, instance, info)
  // 阻止异常继续冒泡，避免击穿外层布局或导致整页白屏
  return false
})

watch(() => route.fullPath, (next, prev) => {
  if (props.resetOnRouteChange && capturedError.value && next !== prev) {
    resetError('route-change')
  }
})

onUnmounted(() => {
  if (copyTimer) {
    clearTimeout(copyTimer)
    copyTimer = null
  }
})

defineExpose({
  captureError,
  resetError,
  capturedError,
  retryCount,
})
</script>

<template>
  <div
    v-if="!capturedError"
    :key="retryKey"
    :class="contained ? 'error-boundary-slot error-boundary-slot--contained' : 'error-boundary-slot'"
  >
    <slot />
  </div>

  <NConfigProvider
    v-else
    :theme="isDark ? darkTheme : null"
    :theme-overrides="naiveOverrides"
    :locale="zhCN"
  >
    <section
      class="error-boundary"
      :class="{ 'error-boundary--contained': contained }"
      role="alert"
      aria-live="assertive"
      data-testid="app-error-boundary"
    >
      <div v-if="!contained" class="error-boundary__glow error-boundary__glow--top" aria-hidden="true" />
      <div v-if="!contained" class="error-boundary__glow error-boundary__glow--bottom" aria-hidden="true" />

      <div class="error-boundary__card">
        <div class="error-boundary__header">
          <div class="error-boundary__badge" aria-hidden="true">
            <NIcon :component="AlertCircleOutline" :size="28" />
          </div>
          <div class="error-boundary__code">
            错误编号：{{ capturedError.id }}
          </div>
          <h1 class="error-boundary__title">
            {{ recoveryCopy?.title }}
          </h1>
          <p class="error-boundary__desc">
            {{ recoveryCopy?.description }}
          </p>
        </div>

        <p v-if="recoveryCopy?.hint" class="error-boundary__hint">
          {{ recoveryCopy.hint }}
        </p>

        <div class="error-boundary__actions">
          <NButton
            type="primary"
            size="large"
            class="error-boundary__btn"
            @click="handleRetry"
          >
            <template #icon>
              <NIcon :component="RefreshOutline" />
            </template>
            重试恢复
          </NButton>

          <NButton
            size="large"
            class="error-boundary__btn"
            @click="handleReload"
          >
            <template #icon>
              <NIcon :component="ReloadOutline" />
            </template>
            刷新页面
          </NButton>

          <NButton
            size="large"
            quaternary
            class="error-boundary__btn"
            @click="handleGoHome"
          >
            <template #icon>
              <NIcon :component="HomeOutline" />
            </template>
            {{ homeActionLabel }}
          </NButton>
        </div>

        <div class="error-boundary__disclosure">
          <div class="error-boundary__disclosure-bar">
            <button
              type="button"
              class="error-boundary__toggle"
              :aria-expanded="showDetails"
              aria-controls="error-boundary-details"
              @click="showDetails = !showDetails"
            >
              <span>{{ showDetails ? '收起错误详情' : '查看错误详情' }}</span>
              <NIcon :component="showDetails ? ChevronUpOutline : ChevronDownOutline" :size="16" />
            </button>

            <button
              type="button"
              class="error-boundary__copy"
              @click="handleCopyDetails"
            >
              <NIcon :component="copied ? CheckmarkOutline : CopyOutline" :size="15" />
              <span>{{ copied ? '已复制诊断信息' : '复制错误信息' }}</span>
            </button>
          </div>

          <div
            v-if="showDetails"
            id="error-boundary-details"
            class="error-boundary__details"
          >
            <dl class="error-boundary__meta">
              <div>
                <dt>来源组件</dt>
                <dd>{{ capturedError.componentName }}</dd>
              </div>
              <div>
                <dt>生命周期</dt>
                <dd>{{ capturedError.lifecycleInfo }}</dd>
              </div>
              <div>
                <dt>页面路径</dt>
                <dd>{{ capturedError.path }}</dd>
              </div>
              <div>
                <dt>异常信息</dt>
                <dd>{{ capturedError.name }}: {{ capturedError.message }}</dd>
              </div>
            </dl>

            <pre v-if="capturedError.stack" class="error-boundary__stack">{{ capturedError.stack }}</pre>
          </div>
        </div>
      </div>
    </section>
  </NConfigProvider>
</template>

<style scoped>
.error-boundary-slot {
  display: contents;
}

.error-boundary-slot--contained {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.error-boundary {
  position: relative;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px 16px;
  background: var(--background);
  color: var(--foreground);
}

.error-boundary--contained {
  flex: 1;
  min-height: min(520px, 100%);
  border-radius: 12px;
  background: transparent;
}

.error-boundary__glow {
  position: absolute;
  pointer-events: none;
  border-radius: 9999px;
}

.error-boundary__glow--top {
  top: -180px;
  right: -140px;
  width: 460px;
  height: 460px;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%);
}

.error-boundary__glow--bottom {
  bottom: -160px;
  left: -120px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, color-mix(in srgb, var(--destructive, #dc2626) 6%, transparent) 0%, transparent 70%);
}

.error-boundary__card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  padding: 32px 28px 24px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card);
  box-shadow: 0 14px 36px color-mix(in srgb, var(--foreground) 7%, transparent);
}

.error-boundary__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.error-boundary__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--destructive, #dc2626) 10%, var(--card));
  color: var(--destructive, #dc2626);
  border: 1px solid color-mix(in srgb, var(--destructive, #dc2626) 24%, transparent);
}

.error-boundary__code {
  margin-bottom: 8px;
  padding: 2px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--muted, #f1f5f9) 80%, var(--card));
  color: var(--muted-foreground);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.02em;
}

.error-boundary__title {
  margin: 0;
  color: var(--foreground);
  font-size: 21px;
  font-weight: 700;
  line-height: 1.3;
}

.error-boundary__desc {
  margin: 10px 0 0;
  max-width: 440px;
  color: var(--muted-foreground);
  font-size: 14px;
  line-height: 1.65;
}

.error-boundary__hint {
  margin: 18px 0 0;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--primary) 22%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 6%, var(--card));
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.error-boundary__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
}

.error-boundary__btn {
  min-height: 44px;
  font-weight: 600;
}

.error-boundary__disclosure {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.error-boundary__disclosure-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.error-boundary__toggle,
.error-boundary__copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.error-boundary__toggle:hover,
.error-boundary__copy:hover {
  background: color-mix(in srgb, var(--foreground) 5%, transparent);
  color: var(--foreground);
}

.error-boundary__toggle:focus-visible,
.error-boundary__copy:focus-visible {
  outline: 2px solid var(--ring, var(--primary));
  outline-offset: 2px;
}

.error-boundary__details {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--muted, #f4f6f4) 65%, var(--background));
  text-align: left;
}

.error-boundary__meta {
  display: grid;
  gap: 8px;
  margin: 0;
  font-size: 12.5px;
}

.error-boundary__meta > div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
}

.error-boundary__meta dt {
  color: var(--muted-foreground);
  font-weight: 600;
}

.error-boundary__meta dd {
  margin: 0;
  color: var(--foreground);
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.error-boundary__stack {
  margin: 12px 0 0;
  padding: 10px 12px;
  max-height: 180px;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  line-height: 1.5;
  white-space: pre;
}

@media (max-width: 640px) {
  .error-boundary__card {
    padding: 24px 18px 20px;
  }

  .error-boundary__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .error-boundary__btn {
    width: 100%;
  }

  .error-boundary__toggle,
  .error-boundary__copy {
    min-height: 44px;
  }

  .error-boundary__meta > div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
