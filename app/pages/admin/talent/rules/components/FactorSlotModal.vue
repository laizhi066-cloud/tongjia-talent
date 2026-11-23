<!--
 * @description 潜质要素四段槽位只读弹层（ultra）：按 4 档页签展示每档 3 个变体的四段文案。
 * @file app/pages/admin/talent/rules/components/FactorSlotModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NEmpty,
  NModal,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
} from "naive-ui";
import type { TalentFactorSlot } from "~~/shared/types/talent-rule";
import type { TalentFactorDetail } from "~/composables/api/useTalentRuleApi";

interface Props {
  show: boolean;
  factorId: string;
}

interface SegmentView {
  key: keyof TalentFactorSlot;
  label: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean] }>();

const api = useTalentRuleApi();
const detail = ref<TalentFactorDetail | null>(null);
const loading = ref(false);
const error = ref("");

const segments: SegmentView[] = [
  { key: "content", label: "分级内容" },
  { key: "example", label: "分级举例" },
  { key: "direction", label: "培育方向" },
  { key: "suggestion", label: "培育建议" },
];

const levels = computed(() => {
  const list = detail.value?.levels || [];
  return [...list].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
});

function variants(levelCode: string): TalentFactorSlot[] {
  const list = detail.value?.slots?.[levelCode];
  const result: TalentFactorSlot[] = [];
  for (let index = 0; index < 3; index += 1) {
    result.push(list?.[index] || { content: "", example: "", direction: "", suggestion: "" });
  }
  return result;
}

function isFilled(variant: TalentFactorSlot): boolean {
  return segments.every((segment) => String(variant[segment.key] || "").trim() !== "");
}

function isPartial(variant: TalentFactorSlot): boolean {
  return segments.some((segment) => String(variant[segment.key] || "").trim() !== "");
}

function filledVariants(levelCode: string): number {
  return variants(levelCode).filter(isFilled).length;
}

function variantStatus(variant: TalentFactorSlot): { label: string; type: "success" | "warning" | "default" } {
  if (isFilled(variant)) return { label: "完整", type: "success" };
  if (isPartial(variant)) return { label: "部分回填", type: "warning" };
  return { label: "待补写", type: "default" };
}

async function load(): Promise<void> {
  if (!props.factorId) return;
  loading.value = true;
  error.value = "";
  detail.value = null;
  try {
    detail.value = await api.getFactor(props.factorId);
  } catch {
    error.value = "要素文案加载失败，请关闭弹层重试";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.show,
  (show) => {
    if (show) void load();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    title="潜质要素文案（只读）"
    style="width: min(1180px, calc(100vw - 32px))"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false">{{ error }}</n-alert>
      <template v-else-if="detail">
        <div class="factor-head">
          <span class="factor-code">{{ detail.code }}</span>
          <span class="factor-name">{{ detail.name }}</span>
          <n-tag size="small" :bordered="false">
            {{ detail.category }} {{ detail.categoryName }}
          </n-tag>
          <n-tag size="small" :bordered="false" type="info">
            已填 {{ detail.filledSlotCount }} / {{ detail.slotTotal }} 槽
          </n-tag>
        </div>
        <n-alert type="info" :show-icon="false" class="readonly-hint">
          本文案由外部文库同步写入，后台只读；四段全部非空才算完整槽位，空白段显示「待补写」。
        </n-alert>
        <n-empty v-if="!levels.length" description="当前还没有可用的分级，请先在分级设置中维护" />
        <n-tabs v-else type="line" animated>
          <n-tab-pane
            v-for="level in levels"
            :key="level.code"
            :name="level.code"
            :tab="`${level.name}（已回填 ${filledVariants(level.code)}/3）`"
          >
            <div class="variant-list">
              <article
                v-for="(variant, index) in variants(level.code)"
                :key="`${level.code}-${index}`"
                class="variant-card"
              >
                <header class="variant-head">
                  <span class="variant-title">变体 {{ index + 1 }}</span>
                  <n-tag size="small" :bordered="false" :type="variantStatus(variant).type">
                    {{ variantStatus(variant).label }}
                  </n-tag>
                </header>
                <div class="segment-grid">
                  <div v-for="segment in segments" :key="segment.key" class="segment">
                    <span class="segment-label">{{ segment.label }}</span>
                    <p class="segment-text" :class="{ empty: !String(variant[segment.key] || '').trim() }">
                      {{ String(variant[segment.key] || "").trim() || "待补写" }}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </n-tab-pane>
        </n-tabs>
      </template>
    </n-spin>
    <template #footer>
      <div class="form-footer">
        <n-button class="main-action" @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.factor-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 10px; }
.factor-code { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-weight: 600; }
.factor-name { font-size: 16px; font-weight: 650; }
.readonly-hint { margin-bottom: 12px; line-height: 1.6; }
.variant-list { display: flex; flex-direction: column; gap: 12px; max-height: 56vh; overflow-y: auto; padding-right: 4px; }
.variant-card { padding: 12px 14px; border: 1px solid var(--border-color, #efeff5); border-radius: 10px; background: var(--card-color, #fff); }
.variant-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.variant-title { font-size: 13px; font-weight: 600; }
.segment-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.segment { min-width: 0; padding: 10px 12px; border-radius: 8px; background: var(--muted, #f7f7fa); }
.segment-label { display: block; margin-bottom: 4px; color: var(--text-color-3, #999); font-size: 12px; }
.segment-text { margin: 0; color: var(--text-color, #333); font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.segment-text.empty { color: var(--text-color-3, #999); font-style: italic; }
.form-footer { display: flex; justify-content: flex-end; }
.main-action { min-height: 44px; }
@media (max-width: 720px) {
  .segment-grid { grid-template-columns: 1fr; }
}
</style>