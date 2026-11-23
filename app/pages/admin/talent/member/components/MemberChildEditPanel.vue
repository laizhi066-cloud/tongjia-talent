<!--
 * @description 子女就地编辑 / 新增面板（详情弹层内展开，不再叠第二层弹窗）：
 *   姓名 / 性别 / 与家长关系 / 出生日期 / 身份证；编辑态证件留空表示不修改。
 * @file app/pages/admin/talent/member/components/MemberChildEditPanel.vue
-->
<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui";
import type { TalentMemberChildDetail, TalentMemberChildUpdateInput } from "~/composables/api/useTalentMemberApi";
import {
  TALENT_CHILD_RELATIONS,
  TALENT_CHILD_RELATION_LABELS,
  TALENT_MEMBER_GENDERS,
  TALENT_MEMBER_GENDER_LABELS,
  type TalentMemberChildView,
} from "~~/shared/types/talent-member";
import {
  idNoMatchesBirthday,
  isValidBirthdayText,
  MEMBER_ID_NO_RE,
  todayText,
} from "../member-form";

interface Props {
  /** 所属家长档案 id；新增子女时必填。 */
  parentId: string;
  /** 传入子女记录为编辑态，`null` 为新增态。 */
  child: TalentMemberChildDetail | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ saved: [child: TalentMemberChildView]; cancel: [] }>();

const api = useTalentMemberApi();
const message = useMessage();

const saving = ref(false);
const errors = ref<string[]>([]);
const fieldErrors = reactive<Record<string, string>>({
  name: "",
  gender: "",
  relation: "",
  birthday: "",
  idNo: "",
});

const form = reactive({
  name: "",
  gender: "female" as "male" | "female" | "",
  relation: "",
  birthday: "",
  idNo: "",
});

const isEditing = computed(() => Boolean(props.child));
const title = computed(() => (isEditing.value ? "编辑子女" : "新增子女"));

const genderOptions = TALENT_MEMBER_GENDERS.map((value) => ({
  label: TALENT_MEMBER_GENDER_LABELS[value],
  value,
}));
const relationOptions = TALENT_CHILD_RELATIONS.map((value) => ({
  label: TALENT_CHILD_RELATION_LABELS[value],
  value,
}));

function reset(): void {
  const child = props.child;
  form.name = child?.name || "";
  form.gender = child?.gender || "female";
  form.relation = child?.relation || "";
  form.birthday = child?.birthday || "";
  form.idNo = "";
  errors.value = [];
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = "";
}

/** 客户端预校验：必填 + 证件 18 位 + 证件生日一致（服务端仍做最终判定）。 */
function validate(): boolean {
  const messages: string[] = [];
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = "";
  if (!form.name.trim()) {
    fieldErrors.name = "请输入子女姓名";
    messages.push(fieldErrors.name);
  } else if (form.name.trim().length > 50) {
    fieldErrors.name = "子女姓名不能超过 50 个字符";
    messages.push(fieldErrors.name);
  }
  if (!form.gender) {
    fieldErrors.gender = "请选择子女性别";
    messages.push(fieldErrors.gender);
  }
  if (!form.relation) {
    fieldErrors.relation = "请选择与家长关系";
    messages.push(fieldErrors.relation);
  }
  if (!form.birthday.trim()) {
    fieldErrors.birthday = "请填写出生日期";
    messages.push(fieldErrors.birthday);
  } else if (!isValidBirthdayText(form.birthday.trim())) {
    fieldErrors.birthday = "出生日期格式应为 YYYY-MM-DD";
    messages.push(fieldErrors.birthday);
  } else if (form.birthday.trim() > todayText()) {
    fieldErrors.birthday = "出生日期不能晚于今天";
    messages.push(fieldErrors.birthday);
  }

  const idNo = form.idNo.trim();
  const idNoRequired = !isEditing.value;
  if (!idNo && idNoRequired) {
    fieldErrors.idNo = "请填写子女身份证号";
    messages.push(fieldErrors.idNo);
  } else if (idNo && !MEMBER_ID_NO_RE.test(idNo)) {
    fieldErrors.idNo = "身份证号应为 18 位";
    messages.push(fieldErrors.idNo);
  } else if (idNo) {
    const birthday = form.birthday.trim();
    if (!birthday) {
      fieldErrors.idNo = "填写身份证时必须填写出生日期";
      messages.push(fieldErrors.idNo);
    } else if (!idNoMatchesBirthday(idNo, birthday)) {
      fieldErrors.idNo = "身份证号与出生日期不一致";
      messages.push(fieldErrors.idNo);
    }
  }
  errors.value = messages;
  return messages.length === 0;
}

async function handleSave(): Promise<void> {
  if (saving.value) return;
  if (!validate()) {
    message.warning(errors.value[0] || "请检查子女资料");
    return;
  }
  saving.value = true;
  try {
    const body: TalentMemberChildUpdateInput = {
      name: form.name.trim(),
      gender: form.gender as "male" | "female",
      relation: form.relation,
      birthday: form.birthday.trim(),
    };
    const idNo = form.idNo.trim();
    if (idNo) body.idNo = idNo.toUpperCase();
    if (isEditing.value) {
      const result = await api.updateMemberChild(props.child!.id, body);
      emit("saved", result.child);
    } else {
      const result = await api.createMemberChild(props.parentId, {
        name: body.name!,
        gender: body.gender as "male" | "female",
        relation: body.relation!,
        birthday: body.birthday!,
        idNo: body.idNo || "",
      });
      emit("saved", result.child);
    }
  } catch {
    // useApi 已统一提示服务端错误（409 该子女档案已存在 / 422 证件与生日不一致等）。
  } finally {
    saving.value = false;
  }
}

watch(
  () => [props.child?.id, props.parentId],
  () => reset(),
  { immediate: true },
);
</script>

<template>
  <section class="child-edit-panel" aria-label="子女档案编辑面板">
    <header class="panel-head">
      <b>{{ title }}</b>
      <span v-if="isEditing" class="panel-sub mono">{{ props.child?.maskedIdNo }}</span>
      <n-button size="tiny" quaternary @click="emit('cancel')">收起</n-button>
    </header>

    <n-form label-placement="top">
      <div class="panel-grid">
        <n-form-item
          label="姓名"
          required
          :validation-status="fieldErrors.name ? 'error' : undefined"
          :feedback="fieldErrors.name"
        >
          <n-input v-model:value="form.name" :maxlength="50" placeholder="子女姓名" />
        </n-form-item>
        <n-form-item
          label="性别"
          required
          :validation-status="fieldErrors.gender ? 'error' : undefined"
          :feedback="fieldErrors.gender"
        >
          <n-select v-model:value="form.gender" :options="genderOptions" placeholder="请选择性别" />
        </n-form-item>
        <n-form-item
          label="与家长关系"
          required
          :validation-status="fieldErrors.relation ? 'error' : undefined"
          :feedback="fieldErrors.relation"
        >
          <n-select v-model:value="form.relation" :options="relationOptions" placeholder="请选择关系" />
        </n-form-item>
        <n-form-item
          label="出生日期"
          required
          :validation-status="fieldErrors.birthday ? 'error' : undefined"
          :feedback="fieldErrors.birthday"
        >
          <n-input v-model:value="form.birthday" placeholder="YYYY-MM-DD" :maxlength="10" />
        </n-form-item>
        <n-form-item
          class="panel-idno"
          :label="isEditing ? '身份证号（留空不修改）' : '身份证号'"
          :required="!isEditing"
          :validation-status="fieldErrors.idNo ? 'error' : undefined"
          :feedback="fieldErrors.idNo"
        >
          <n-input
            v-model:value="form.idNo"
            placeholder="18 位身份证号"
            :maxlength="18"
          />
        </n-form-item>
      </div>
    </n-form>

    <p v-if="isEditing" class="panel-hint">原证件已脱敏，不修改请留空；证件或生日变更后会自动重新查询。</p>
    <div class="panel-actions">
      <n-button @click="emit('cancel')">取消</n-button>
      <n-button type="primary" :loading="saving" @click="handleSave">
        {{ isEditing ? "保存子女资料" : "新增子女并入查询" }}
      </n-button>
    </div>
  </section>
</template>

<style scoped>
.child-edit-panel {
  padding: 14px 16px;
  margin-bottom: 12px;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.panel-head b { color: var(--foreground); font-size: 14px; font-weight: 600; }
.panel-sub { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.panel-head :deep(.n-button) { margin-left: auto; }
.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0 16px;
}
.panel-idno { grid-column: 1 / -1; }
.panel-hint { margin: 0 0 10px; color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.6; }
.panel-actions { display: flex; justify-content: flex-end; gap: 10px; }
.panel-actions :deep(.n-button) { min-height: 44px; }
.mono { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
</style>