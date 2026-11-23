<!--
 * @description 培育建议书弹层（ultra，只读同步原文）：信息条 + 按分册分组（A–F 升序）逐条四段
 *   （分级内容 / 分级举例 / 培育方向 / 培育建议，空段显示「—」）；variant>1 标「变体 N」。
 *   无编辑 / 上传 / 下载入口，底部只有「关闭」（spec §6.2）。
 * @file app/pages/admin/talent/advice/components/AdviceBookModal.vue
-->
<script setup lang="ts">
import { NAlert, NButton, NModal, NSpin, NTag } from "naive-ui";
import type { TalentAdviceDocDetail } from "~/composables/api/useTalentAdviceApi";
import { TALENT_ADVICE_SOURCE_LABELS } from "~~/shared/types/talent-advice";
import { adviceEntropyTagType, adviceSectionParagraphs } from "./advice-ui";

interface Props {
  show: boolean;
  adviceId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean] }>();

const api = useTalentAdviceApi();

const loading = ref(false);
const error = ref("");
const detail = ref<TalentAdviceDocDetail | null>(null);

const subtitle = computed(() => {
  const value = detail.value;
  if (!value) return "";
  const count = value.bookCount || value.books.length;
  return `${value.owner.matchKey || value.owner.name} · ${count} 个分册对应 ${count} 份建议书（一册一份）`;
});

/** 信息条（spec §6.2-1）：编号 / 报告 / 身份 / 匹配 / 版本 / 来源 / 分册 / 状态 / 派生可见性。 */
const facts = computed<Array<{ label: string; value: string; mono?: boolean }>>(
  () => {
    const value = detail.value;
    if (!value) return [];
    const withdrawnNote =
      value.publishStatus === "withdrawn" && value.withdrawnAt
        ? `${value.publishStatusLabel}（撤回于 ${formatTime(value.withdrawnAt)}）`
        : value.publishStatusLabel;
    return [
      { label: "建议编号", value: value.adviceNo, mono: true },
      { label: "关联基因报告", value: value.report?.reportNo || "—", mono: true },
      { label: "本人姓名", value: value.owner.name || "—" },
      { label: "性别", value: value.owner.genderLabel || "—" },
      { label: "出生日期", value: value.owner.birthday || "—", mono: true },
      { label: "年龄", value: value.owner.ageLabel || "—" },
      { label: "匹配口径", value: value.owner.matchKey || "—" },
      {
        label: "所属版本",
        value: `${value.version.versionNo || "—"}（${value.version.statusLabel}）`,
      },
      { label: "生效周期", value: value.version.cycle || "—" },
      { label: "同步时间", value: formatTime(value.syncedAt) || "—" },
      {
        label: "来源系统",
        value: TALENT_ADVICE_SOURCE_LABELS[value.source] ?? value.source,
      },
      {
        label: "覆盖分册",
        value: `${value.booksCovered || "—"}（${value.bookCount} 个分册）`,
        mono: true,
      },
      {
        label: "建议书份数",
        value: `${value.bookCount} 份（一个分册一份）`,
      },
      { label: "发布状态", value: withdrawnNote },
      { label: "家长端可见性", value: value.clientVisibleText || "—" },
    ];
  },
);

async function load(): Promise<void> {
  if (!props.adviceId) return;
  loading.value = true;
  error.value = "";
  try {
    detail.value = await api.getAdviceDetail(props.adviceId);
  } catch {
    error.value = "建议书加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.show, props.adviceId] as const,
  ([show]) => {
    if (!show) return;
    detail.value = null;
    void load();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    style="width: min(1180px, calc(100vw - 32px))"
    data-testid="advice-book-modal"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="modal-head">
        <div class="modal-title">培育建议书（同步原文）</div>
        <div v-if="subtitle" class="modal-subtitle">{{ subtitle }}</div>
      </div>
    </template>

    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="book-error">
        {{ error }}
      </n-alert>

      <template v-if="detail">
        <div class="kv-strip" data-testid="advice-book-facts">
          <span v-for="fact in facts" :key="fact.label" class="fact">
            <i>{{ fact.label }}</i>
            <span :class="{ mono: fact.mono }">{{ fact.value }}</span>
          </span>
        </div>

        <section
          v-for="(book, bookIndex) in detail.books"
          :key="book.book"
          class="book-group"
          :data-testid="`advice-book-group-${book.book}`"
        >
          <header class="book-head">
            <b class="book-title">
              第 {{ bookIndex + 1 }} 分册 · {{ book.bookName }} · 建议书
            </b>
            <span class="book-meta">
              <span class="mono">{{ book.adviceNo }}</span>
              · 本册 {{ book.sectionCount }} 项
              <template v-if="book.entropyText"> · 数据熵 {{ book.entropyText }}</template>
            </span>
          </header>

          <article
            v-for="(section, sectionIndex) in book.sections"
            :key="`${book.book}-${sectionIndex}`"
            class="section-card"
          >
            <div class="section-head">
              <b>第 {{ sectionIndex + 1 }} 项 · {{ section.factor }}</b>
              <span class="section-chapter">{{ section.chapter || "—" }}</span>
              <n-tag
                size="small"
                :bordered="false"
                :type="adviceEntropyTagType(section.entropy)"
              >
                {{ section.entropy }}
              </n-tag>
              <n-tag v-if="section.variant > 1" size="small" :bordered="false">
                变体 {{ section.variant }}
              </n-tag>
            </div>
            <dl class="section-paragraphs">
              <template
                v-for="paragraph in adviceSectionParagraphs(section)"
                :key="paragraph.key"
              >
                <dt>{{ paragraph.label }}</dt>
                <dd :class="{ 'is-empty': !paragraph.text }">
                  {{ paragraph.text || "—" }}
                </dd>
              </template>
            </dl>
          </article>
        </section>

        <p v-if="!detail.books.length" class="book-empty">
          该建议书没有可展示的分册正文。
        </p>

        <div class="book-notes">
          <p>
            分册口径：每个分册对应一份建议书，按分册内嵌四段家长文案；一册一份、各自独立编号
            （建议编号 + 分册编码），不跨分册合并。
          </p>
          <p>
            只读说明：建议书由外部系统按固定格式推送，按「姓名 + 具体年龄（周岁）」匹配生成；
            本系统不修改正文，仅同步与更新。
          </p>
        </div>
      </template>
    </n-spin>

    <template #footer>
      <div class="modal-footer">
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-head { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.modal-title { font-size: 16px; font-weight: 600; }
.modal-subtitle { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.book-error { margin-bottom: 12px; line-height: 1.7; }
.kv-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 6px 20px;
  padding: 10px 12px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.fact { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; font-size: 13px; }
.fact i {
  flex: 0 0 auto;
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  font-style: normal;
}
.fact span { min-width: 0; overflow-wrap: anywhere; }
.book-group { margin-bottom: 18px; }
.book-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 16px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.book-title { font-size: 14px; }
.book-meta { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.section-card {
  padding: 10px 12px;
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--muted);
}
.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-bottom: 8px;
  font-size: 13px;
}
.section-chapter { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.section-paragraphs {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 4px 12px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}
.section-paragraphs dt {
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  font-weight: 400;
}
.section-paragraphs dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.section-paragraphs dd.is-empty { color: var(--muted-foreground, #6c756a); }
.book-empty { padding: 24px 0; color: var(--muted-foreground, #6c756a); font-size: 13px; text-align: center; }
.book-notes {
  padding-top: 10px;
  border-top: 1px solid var(--border);
  color: var(--muted-foreground, #6c756a);
  font-size: 12px;
  line-height: 1.8;
}
.book-notes p { margin: 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); white-space: nowrap; }
</style>