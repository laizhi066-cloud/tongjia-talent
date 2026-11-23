/**
 * @description 管理后台列表页布局容器 — 统一页面结构，Card 内部滚动
 * @file app/components/AdminListPage.vue
 *
 * @prop loading — 加载中状态（设为 true 显示骨架屏）
 * @prop empty — 空状态（设为 true 显示空状态）
 * @prop error — 加载失败说明（有值时显示重试态，不伪装为空数据）
 *
 * @slot headerExtra — 卡片右上角操作区（添加按钮等）
 * @slot tabs — 列表分组切换区（位于筛选区上方，横跨整行）
 * @slot search — 搜索区域的输入控件（多个直接并列放）
 * @slot searchActions — 搜索/重置按钮组
 * @slot batchActions — 批量操作栏（选中有记录时显示）
 * @slot default — 表格（loading/empty 为 false 时显示）
 * @slot pagination — 分页组件
 */
<script setup lang="ts">
import { NButton, NCard, NResult } from 'naive-ui'

defineProps<{
  title: string
  loading?: boolean
  empty?: boolean
  error?: string
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <n-card class="admin-list-page" content-style="display:flex;flex-direction:column;flex:1;min-height:0;padding:0;">
    <template #header>
      <div class="list-header">
        <span class="list-title">{{ title }}</span>
        <div v-if="$slots.headerExtra" class="list-header-extra">
          <slot name="headerExtra" />
        </div>
      </div>
    </template>

    <div v-if="$slots.tabs || $slots.search || $slots.searchActions" class="search-area shrink-0">
      <div v-if="$slots.tabs" class="tabs-area" :class="{ 'tabs-area--with-search': $slots.search || $slots.searchActions }">
        <slot name="tabs" />
      </div>
      <div v-if="$slots.search || $slots.searchActions" class="search-layout">
        <div v-if="$slots.search" class="search-grid">
          <slot name="search" />
        </div>
        <div v-if="$slots.searchActions" class="search-actions">
          <slot name="searchActions" />
        </div>
      </div>
    </div>

    <div class="table-area">
      <slot v-if="loading" name="skeleton">
        <AdminSkeletonCard />
      </slot>
      <slot v-else-if="error" name="error">
        <NResult status="error" title="加载失败" :description="error">
          <template #footer>
            <NButton type="primary" @click="emit('retry')">重试</NButton>
          </template>
        </NResult>
      </slot>
      <slot v-else-if="empty" name="empty">
        <AdminEmptyState />
      </slot>
      <!-- 默认插槽改用 v-show 常驻挂载：放在其中的弹窗(NModal 等)在 空/加载 状态也能挂载并 teleport 到 body。
           否则「空列表点新增弹不出」——而空列表正是最需要新增的时候。加载、空态或错误态时表格由 v-show 隐藏、不占布局。 -->
      <div v-show="!loading && !empty && !error" class="table-default-slot">
        <slot />
      </div>
    </div>

    <div v-if="$slots.pagination" class="pagination-area">
      <slot name="pagination" />
    </div>
  </n-card>
</template>

<style lang="scss" scoped>
.admin-list-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.list-title {
  min-width: 0;
  font-size: 18px;
  font-weight: 600;
}

.list-header-extra {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.search-area {
  padding: 12px 24px 16px;
}

.search-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  width: 100%;
  min-width: 0;
}

.tabs-area {
  display: flex;
  width: 100%;
  min-width: 0;
}

.tabs-area--with-search {
  margin-bottom: 12px;
}

.search-grid {
  display: grid;
  /* 筛选项更紧凑：单列 160~200px（原 220~280 过宽）；窄屏自适应单列 */
  grid-template-columns: repeat(auto-fill, minmax(min(160px, 100%), 200px));
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.search-grid :deep(> *) {
  width: 100% !important;
  min-width: 0;
}

/* 日期选择器(尤其 daterange「开始 至 结束」)占 2 列，否则被压到 200px 内、占位符看不全 */
.search-grid :deep(.n-date-picker) {
  grid-column: span 2;
}

.search-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.table-area {
  /* 表格自管滚动(flex-height)：父级不滚动，由表格内部出现置底常驻横向滚动条，固定列才生效 */
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
}

/* 默认插槽包裹层：继承 table-area 的 flex 列布局，保证表格 flex-height 不变；v-show 隐藏时 display:none 不占位 */
.table-default-slot {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.table-area :deep(.n-data-table) {
  /* Naive 给根节点设 min-width=列宽总和会撑破卡片；收回卡片宽度，让内部表体横向滚动、固定列吸附 */
  width: 100%;
  min-width: 0 !important;
  flex: 1;
  min-height: 0;
}

/* Naive 自带横向滚动条常显(默认 hover 才出现，用户以为不能横滚) */
.table-area :deep(.n-scrollbar-rail--horizontal) {
  opacity: 1;
}
.table-area :deep(.n-scrollbar-rail--horizontal .n-scrollbar-rail__scrollbar) {
  background-color: var(--border);
}

.table-area :deep(.n-data-table) {
  width: 100%;
}

/*
 * 固定列阴影常显：Naive 默认仅在表格「可横向滚动」时才给固定列加阴影
 * (rightActiveFixedColKey 非空)，于是「内容超宽的表」有阴影、「内容不超宽的表」没有，
 * 视觉不一致。这里复用 Naive 自身的阴影变量(自动适配明暗)，让固定操作列始终有分隔阴影。
 */
.table-area :deep(.n-data-table-td--fixed-right::before),
.table-area :deep(.n-data-table-th--fixed-right::before) {
  box-shadow: var(--n-box-shadow-before);
}
.table-area :deep(.n-data-table-td--fixed-left::after),
.table-area :deep(.n-data-table-th--fixed-left::after) {
  box-shadow: var(--n-box-shadow-after);
}

.pagination-area {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

@media (max-width: 900px) {
  .search-layout {
    grid-template-columns: 1fr;
  }

  .search-grid {
    /* 仍保持定宽栅格：避免 1fr 把少量筛选项拉伸成整行大输入框 */
    grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 240px));
  }

  .search-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .list-header {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .list-header-extra {
    flex-wrap: wrap;
    width: 100%;
  }

  .search-area,
  .table-area,
  .pagination-area {
    padding-right: 16px;
    padding-left: 16px;
  }

  .pagination-area {
    justify-content: flex-start;
    overflow-x: auto;
  }

}
</style>
