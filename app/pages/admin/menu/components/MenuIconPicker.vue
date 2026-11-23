/**
 * @description 菜单图标选择器弹窗 — 搜索 + 网格展示
 * @file app/pages/admin/menu/components/MenuIconPicker.vue
 */
<script setup lang="ts">
import { allIcons } from '~/composables/useIcons'


import { NModal, NInput, NIcon } from 'naive-ui'
const show = defineModel<boolean>('open')
const selectedIcon = defineModel<string>('selected', { default: '' })

const emit = defineEmits<{ select: [name: string] }>()

const iconSearch = ref('')

const filteredIcons = computed(() => {
  if (!iconSearch.value) return allIcons
  const q = iconSearch.value.toLowerCase()
  return allIcons.filter(i => i.label.includes(q) || i.name.includes(q))
})

function selectIcon(name: string) {
  selectedIcon.value = name
  emit('select', name)
  show.value = false
  iconSearch.value = ''
}
</script>

<template>
  <n-modal v-model:show="show" preset="card" title="选择图标" style="max-width: 620px" :bordered="false">
    <n-input v-model:value="iconSearch" placeholder="搜索图标" class="mb-3" />
    <div class="icon-grid">
      <button
        v-for="icon in filteredIcons"
        :key="icon.name"
        type="button"
        class="icon-item"
        :class="{ active: selectedIcon === icon.name }"
        :aria-label="`选择图标 ${icon.label}`"
        :aria-pressed="selectedIcon === icon.name"
        @click="selectIcon(icon.name)"
      >
        <n-icon :component="icon.component" :size="22" />
        <span class="icon-label">{{ icon.label }}</span>
      </button>
      <div v-if="filteredIcons.length === 0" class="icon-empty">未找到匹配的图标</div>
    </div>
  </n-modal>
</template>

<style lang="scss" scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding: 4px 0;
}

.icon-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  border: 1px solid transparent;
  color: inherit;

  &:hover {
    background: var(--accent);
    border-color: var(--border);
  }

  &.active {
    background: color-mix(in srgb, var(--primary) 8%, transparent);
    border-color: var(--primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 1px;
  }
}

.icon-label {
  font-size: 11px;
  color: var(--muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

.icon-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 32px 0;
  color: var(--muted-foreground);
}
</style>
