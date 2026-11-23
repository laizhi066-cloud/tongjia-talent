<!--
/**
 * @description 后台皮肤选择器 — B 端管理后台的主题预设 + 亮暗切换（useTheme，全局保存）。
 *   从原 /admin/theme 页抽出为组件，供站点配置「外观」tab 复用，让 B 端皮肤与 C 端外观同处配置。
 * @file app/components/admin/AdminSkinPicker.vue
 */
-->
<script setup lang="ts">
import { CheckmarkOutline } from '@vicons/ionicons5'
import { NCard, NIcon, NSwitch, useMessage } from 'naive-ui'

const message = useMessage()
const { themes, currentThemeId, isDark, primaryColor, setTheme, toggleDark } = useTheme()
const emit = defineEmits<{
  /** 皮肤切换已持久化后通知外层同步尚未保存的站点表单主色。 */
  primaryColorChange: [color: string]
}>()

/** 水合状态：SSR 时不渲染选中态，避免 hydration mismatch */
const isHydrated = ref(false)
onMounted(() => { isHydrated.value = true })
const activeId = currentThemeId

/** CSS var 索引映射（themes.ts 里每套主题是一个色值数组） */
const IDX: Record<string, number> = {
  primary: 6, background: 0, 'sidebar-background': 26, 'sidebar-primary': 26,
  secondary: 8, accent: 12, muted: 10, foreground: 1, 'sidebar-foreground': 27,
}

function getThemeGradient(theme: typeof themes[number], dark: boolean): string {
  const c = dark ? theme.dark : theme.light
  const primary = c[IDX.primary!]!
  const sidebar = c[IDX['sidebar-primary']!] || primary
  return `linear-gradient(135deg, ${primary} 0%, ${sidebar} 100%)`
}
function getThemeSwatches(theme: typeof themes[number], dark: boolean): string[] {
  const c = dark ? theme.dark : theme.light
  return [c[IDX.primary!]!, c[IDX.background!]!, c[IDX['sidebar-background']!]!, c[IDX.secondary!]!]
}
async function handleSelectTheme(id: string): Promise<void> {
  if (id === currentThemeId.value) return
  await setTheme(id)
  activeId.value = id
  emit('primaryColorChange', primaryColor.value)
  message.success(`已切换至 ${themes.find(t => t.id === id)?.name} 主题`)
}
function handleToggleDark() {
  toggleDark()
  message.success(isDark.value ? '已切换至暗色模式' : '已切换至明亮模式')
}
</script>

<template>
  <div class="skin-picker">
    <NCard size="small" class="mb-4">
      <div class="flex items-center justify-between py-1">
        <div>
          <div class="font-medium">
            深色模式
          </div>
          <div class="text-sm text-muted-foreground">
            切换本管理后台的亮色 / 暗色显示
          </div>
        </div>
        <NSwitch :value="isDark" @update:value="handleToggleDark" />
      </div>
    </NCard>

    <div class="theme-grid">
      <template v-for="theme in themes" :key="theme.id">
        <div v-if="!isHydrated" class="theme-card">
          <div class="theme-card-preview">
            <div class="absolute inset-0 opacity-90" :style="{ background: getThemeGradient(theme, false) }" />
            <div class="absolute top-2 left-3 right-3">
              <span class="text-xs font-semibold text-white/90 drop-shadow-sm">{{ theme.name }}</span>
            </div>
          </div>
          <div class="px-3 py-2 flex items-center gap-1.5 border-t border-border/50">
            <div v-for="(swatch, idx) in getThemeSwatches(theme, false).slice(0, 3)" :key="idx" class="w-4 h-4 rounded-full border border-border/40" :style="{ background: swatch }" />
          </div>
        </div>
        <button
          v-else
          type="button"
          class="theme-card cursor-pointer"
          :aria-label="`切换为${theme.name}主题`"
          :aria-pressed="activeId === theme.id"
          :style="activeId === theme.id ? 'outline:2px solid var(--primary);outline-offset:2px' : ''"
          @click="handleSelectTheme(theme.id)"
        >
          <div class="theme-card-preview">
            <div class="absolute inset-0 opacity-90 transition-all" :style="{ background: getThemeGradient(theme, isDark) }" />
            <div class="absolute top-2 left-3 right-3 flex items-center justify-between">
              <span class="text-xs font-semibold text-white/90 drop-shadow-sm">{{ theme.name }}</span>
              <NIcon v-if="activeId === theme.id" :component="CheckmarkOutline" size="16" class="text-white drop-shadow-sm" />
            </div>
          </div>
          <div class="px-3 py-2 flex items-center gap-1.5 border-t border-border/50">
            <div v-for="(swatch, idx) in getThemeSwatches(theme, isDark)" :key="idx" class="w-4 h-4 rounded-full border border-border/40 shadow-xs" :style="{ background: swatch }" />
            <span class="ml-auto text-xs text-muted-foreground">{{ theme.name }}</span>
          </div>
        </button>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 14px;
  width: 100%;
  min-width: 0;
}
.theme-card {
  width: 100%;
  padding: 0;
  color: inherit;
  text-align: left;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--card);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 15%, transparent);
  }

  &[style*="outline"] {
    border-color: var(--primary);
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
}
.theme-card-preview {
  position: relative;
  height: 76px;
  background: var(--muted);
  overflow: hidden;
}
</style>
