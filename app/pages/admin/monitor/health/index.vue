<!--
/**
 * @description 基础系统健康页，展示单 PocketBase 连接、错误摘要和环境状态。
 * @file app/pages/admin/monitor/health/index.vue
 */
-->
<script setup lang="ts">
import { NAlert, NButton, NCard, NEmpty, NSpin, NTag } from 'naive-ui'

definePageMeta({ layout: 'admin', middleware: ['auth', 'permission-guard', 'super-guard'] })

const { fetchHealth } = useHealthApi()
const loading = ref(false)
const snapshot = ref<FoundationHealthSnapshot | null>(null)
const errorMessage = ref('')

const overallMeta = {
  healthy: { label: '健康', type: 'success' as const },
  degraded: { label: '需关注', type: 'warning' as const },
  critical: { label: '异常', type: 'error' as const },
}

const overall = computed(() => snapshot.value ? overallMeta[snapshot.value.overall] : null)

async function load(): Promise<void> {
  loading.value = true
  try {
    snapshot.value = await fetchHealth()
    errorMessage.value = ''
  } catch {
    // 有旧快照时保留诊断信息，但明确标为过期；首次失败则给出可重试空态。
    errorMessage.value = snapshot.value
      ? '暂时无法刷新健康数据，当前展示的是上一次成功获取的快照。'
      : '暂时无法获取系统健康数据，请检查服务连接后重试。'
  } finally {
    loading.value = false
  }
}

onMounted(() => { void load() })
</script>

<template>
  <div class="health-page admin-scroll-page">
    <header class="health-page__header">
      <div>
        <h1 class="health-page__title">系统健康</h1>
        <p class="health-page__description">检查单实例 PocketBase、错误积压、在线会话与运行环境。</p>
      </div>
      <NButton :loading="loading" @click="load">刷新状态</NButton>
    </header>

    <NAlert v-if="errorMessage" type="error" :bordered="false" title="健康检查暂不可用">{{ errorMessage }}</NAlert>
    <NAlert v-else-if="snapshot?.overall === 'critical'" type="error" :bordered="false">PocketBase 连接或必需环境变量异常，请优先处理红色项目。</NAlert>
    <NAlert v-else-if="snapshot?.overall === 'degraded'" type="warning" :bordered="false">系统可用，但存在待处理错误或缺少非必需配置。</NAlert>

    <NSpin :show="loading">
      <NEmpty v-if="!snapshot && !loading" description="暂无健康数据">
        <template #extra><NButton @click="load">重新检查</NButton></template>
      </NEmpty>
      <section v-else-if="snapshot" class="health-page__grid" aria-label="系统状态">
      <NCard title="总体状态">
        <div class="health-item">
          <NTag :type="overall?.type" size="large">{{ overall?.label }}</NTag>
          <span class="health-item__muted">更新时间：{{ formatTime(snapshot.timestamp) }}</span>
        </div>
      </NCard>
      <NCard title="PocketBase">
        <div class="health-list">
          <div class="health-item"><span>连接</span><NTag :type="snapshot.datasource.pbConnected ? 'success' : 'error'">{{ snapshot.datasource.pbConnected ? '正常' : '断连' }}</NTag></div>
          <div class="health-item"><span>版本</span><span>{{ snapshot.datasource.pbVersion || '-' }}</span></div>
          <div class="health-item"><span>集合数量</span><span>{{ snapshot.datasource.collections }}</span></div>
        </div>
      </NCard>
      <NCard title="运行摘要">
        <div class="health-list">
          <div class="health-item"><span>在线会话</span><span>{{ snapshot.online }}</span></div>
          <div class="health-item"><span>未处理错误</span><NTag :type="snapshot.errorSummary.unresolved ? 'warning' : 'success'">{{ snapshot.errorSummary.unresolved }}</NTag></div>
          <div class="health-item"><span>今日错误</span><span>{{ snapshot.errorSummary.today }}</span></div>
        </div>
      </NCard>
      <NCard class="health-page__environment" title="环境变量">
        <div class="health-page__tags">
          <NTag v-for="item in snapshot.env" :key="item.key" :type="item.ok ? 'success' : item.required ? 'error' : 'warning'">
            {{ item.label }}：{{ item.ok ? '已配置' : item.required ? '缺失' : '未配置' }}
          </NTag>
        </div>
      </NCard>
      </section>
    </NSpin>
  </div>
</template>

<style lang="scss" scoped>
.health-page { display: flex; flex: 1; flex-direction: column; gap: 16px; }
.health-page__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.health-page__title { margin: 0; font-size: 22px; }
.health-page__description, .health-item__muted { color: var(--muted-foreground); font-size: 14px; }
.health-page__description { margin: 6px 0 0; line-height: 1.6; }
.health-page__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.health-page__environment { grid-column: 1 / -1; }
.health-list { display: flex; flex-direction: column; gap: 12px; }
.health-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 28px; }
.health-page__tags { display: flex; flex-wrap: wrap; gap: 8px; }
@media (max-width: 900px) { .health-page__grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .health-page__header { flex-direction: column; } }
</style>
