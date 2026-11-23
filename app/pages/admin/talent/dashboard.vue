<!--
 * @description 平台工作台：PRD 四张指标卡 + 最近操作；前三张可直达列表。
 * @file app/pages/admin/talent/dashboard.vue
-->
<script setup lang="ts">
import { NButton, NEmpty, NResult, NSpin, NTag } from "naive-ui";

definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] });

interface DashboardData {
  parents: { total: number; boundChildren: number };
  children: { found: number; pending: number; total: number };
  reports: { published: number; pending: number; withdrawn: number; total: number };
  pending: { total: number; pendingReports: number; pendingChildren: number };
  recent: Array<{
    id: string;
    time: string;
    operator: string;
    title: string;
    status: number;
  }>;
}

const data = ref<DashboardData | null>(null);
const loading = ref(false);
const error = ref("");

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    data.value = await useApi<DashboardData>("/api/admin/talent/dashboard");
  } catch {
    error.value = "工作台加载失败，请重试";
  } finally {
    loading.value = false;
  }
}

function go(path: string): void {
  void navigateTo(path);
}

void load();
</script>

<template>
  <div class="dashboard-page">
    <header class="page-head">
      <div>
        <h1>工作台</h1>
        <p>一屏看清规模与待处理量；前三张卡可直达对应列表。</p>
      </div>
      <n-button @click="load">刷新</n-button>
    </header>

    <n-spin :show="loading">
      <n-result v-if="error" status="error" title="加载失败" :description="error">
        <template #footer>
          <n-button type="primary" @click="load">重试</n-button>
        </template>
      </n-result>

      <template v-else-if="data">
        <section class="metric-grid" aria-label="工作台指标">
          <button type="button" class="metric-card" @click="go('/admin/talent/member')">
            <span class="metric-label">注册家长</span>
            <b>{{ data.parents.total }}</b>
            <span class="metric-foot">绑定 {{ data.parents.boundChildren }} 名子女</span>
          </button>

          <button type="button" class="metric-card" @click="go('/admin/talent/member')">
            <span class="metric-label">已出结果</span>
            <b>{{ data.children.found }}</b>
            <span class="metric-foot">待出结果 {{ data.children.pending }} 人</span>
          </button>

          <button type="button" class="metric-card" @click="go('/admin/talent/report')">
            <span class="metric-label">已发布报告</span>
            <b>{{ data.reports.published }}</b>
            <span class="metric-foot">
              待发布 {{ data.reports.pending }} 份 · 已撤回 {{ data.reports.withdrawn }} 份
            </span>
          </button>

          <div class="metric-card is-static">
            <span class="metric-label">待处理事项</span>
            <b>{{ data.pending.total }}</b>
            <span class="metric-foot">
              待发布 {{ data.pending.pendingReports }} 份 · 查询未完成
              {{ data.pending.pendingChildren }} 人
            </span>
          </div>
        </section>

        <section class="recent-panel" aria-label="最近操作">
          <header class="recent-head">
            <h2>最近操作</h2>
            <n-button text type="primary" @click="go('/admin/log/oper-log')">查看全部</n-button>
          </header>
          <ul v-if="data.recent.length" class="recent-list">
            <li v-for="log in data.recent" :key="log.id">
              <time>{{ formatTime(log.time) }}</time>
              <span class="recent-operator">{{ log.operator }}</span>
              <span class="recent-title">{{ log.title }}</span>
              <n-tag size="small" :bordered="false" :type="log.status === 0 ? 'success' : 'error'">
                {{ log.status === 0 ? "成功" : "失败" }}
              </n-tag>
            </li>
          </ul>
          <n-empty v-else description="暂无操作记录" />
        </section>
      </template>
    </n-spin>
  </div>
</template>

<style scoped>
.dashboard-page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.01em; }
.page-head p { margin: 6px 0 0; color: var(--muted-foreground, #6c756a); font-size: 13px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.metric-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  color: var(--foreground);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.metric-card:hover { border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 8%, transparent); }
.metric-card.is-static { cursor: default; }
.metric-card.is-static:hover { border-color: var(--border); box-shadow: none; }
.metric-label { color: var(--muted-foreground, #6c756a); font-size: 13px; }
.metric-card b { color: var(--foreground); font-size: 30px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.metric-foot { color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.5; }
.recent-panel { padding: 16px 18px; border: 1px solid var(--border); border-radius: 12px; background: var(--card); }
.recent-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.recent-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.recent-list { margin: 0; padding: 0; list-style: none; }
.recent-list li { display: grid; grid-template-columns: 140px 100px minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 38px; border-top: 1px solid var(--border); font-size: 13px; }
.recent-list li:first-child { border-top: 0; }
.recent-list time, .recent-operator { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.recent-title { overflow: hidden; color: var(--foreground); text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .metric-grid { grid-template-columns: 1fr; }
  .recent-list li { grid-template-columns: 1fr auto; gap: 4px 10px; padding: 8px 0; }
  .recent-title { grid-column: 1 / -1; }
}
</style>
