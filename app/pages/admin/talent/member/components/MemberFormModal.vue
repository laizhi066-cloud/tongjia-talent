<!--
 * @description 新建 / 编辑会员弹层（wide）：新建为「家长 + 1–10 名子女」动态行；
 *   编辑只维护家长资料（会员编号只读、手机号 / 身份证留空不改），子女在详情中就地编辑。
 * @file app/pages/admin/talent/member/components/MemberFormModal.vue
-->
<script setup lang="ts">
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  useMessage,
} from "naive-ui";
import type {
  TalentMemberChildCreateInput,
  TalentMemberCreateInput,
  TalentMemberUpdateInput,
} from "~/composables/api/useTalentMemberApi";
import {
  TALENT_CHILD_RELATIONS,
  TALENT_CHILD_RELATION_LABELS,
  TALENT_MEMBER_GENDERS,
  TALENT_MEMBER_GENDER_LABELS,
  type TalentMemberGender,
  type TalentMemberParentView,
} from "~~/shared/types/talent-member";
import {
  idNoMatchesBirthday,
  isValidBirthdayText,
  MEMBER_ID_NO_RE,
  MEMBER_MOBILE_RE,
  MEMBER_PARENT_NO_RE,
  todayText,
} from "../member-form";

interface Props {
  show: boolean;
  /** `create` 新建（家长 + 多子女）；`edit` 编辑家长（与行内编辑共用同一弹层）。 */
  mode: "create" | "edit";
  record: TalentMemberParentView | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:show": [value: boolean]; saved: [] }>();

const api = useTalentMemberApi();
const message = useMessage();

const saving = ref(false);
const errors = ref<string[]>([]);
const fieldErrors = reactive<Record<string, string>>({
  parentNo: "",
  name: "",
  mobile: "",
  idNo: "",
  gender: "",
  birthday: "",
  remark: "",
});

const form = reactive({
  parentNo: "",
  name: "",
  mobile: "",
  idNo: "",
  gender: "" as TalentMemberGender | "",
  birthday: "",
  remark: "",
});

interface ChildRowErrors {
  name: string;
  gender: string;
  relation: string;
  birthday: string;
  idNo: string;
}

interface ChildRowState {
  key: number;
  name: string;
  gender: TalentMemberGender | "";
  relation: string;
  birthday: string;
  idNo: string;
  errors: ChildRowErrors;
}

const rows = ref<ChildRowState[]>([]);
let rowSeed = 0;

const isEditing = computed(() => props.mode === "edit");
const title = computed(() => (isEditing.value ? "编辑会员" : "新建会员"));

const genderOptions = TALENT_MEMBER_GENDERS.map((value) => ({
  label: TALENT_MEMBER_GENDER_LABELS[value],
  value,
}));
const parentGenderOptions = [
  { label: "未填写", value: "" },
  ...genderOptions,
];
const relationOptions = TALENT_CHILD_RELATIONS.map((value) => ({
  label: TALENT_CHILD_RELATION_LABELS[value],
  value,
}));

const canAddChild = computed(() => rows.value.length < 10);

function createRow(): ChildRowState {
  rowSeed += 1;
  return {
    key: rowSeed,
    name: "",
    gender: "",
    relation: "",
    birthday: "",
    idNo: "",
    errors: { name: "", gender: "", relation: "", birthday: "", idNo: "" },
  };
}

function reset(): void {
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = "";
  errors.value = [];
  if (isEditing.value) {
    const record = props.record;
    form.parentNo = record?.parentNo || "";
    form.name = record?.name || "";
    form.mobile = "";
    form.idNo = "";
    form.gender = record?.gender || "";
    form.birthday = record?.birthday || "";
    form.remark = record?.remark || "";
    rows.value = [];
    return;
  }
  form.parentNo = "";
  form.name = "";
  form.mobile = "";
  form.idNo = "";
  form.gender = "";
  form.birthday = "";
  form.remark = "";
  rowSeed = 0;
  rows.value = [createRow()];
}

function addChild(): void {
  if (!canAddChild.value) return;
  rows.value = [...rows.value, createRow()];
}

function removeChild(key: number): void {
  if (rows.value.length <= 1) return;
  rows.value = rows.value.filter((row) => row.key !== key);
}

function validateParent(): boolean {
  const messages: string[] = [];
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = "";
  const parentNo = form.parentNo.trim();
  if (parentNo && !MEMBER_PARENT_NO_RE.test(parentNo)) {
    fieldErrors.parentNo = "会员编号格式应为 P + 12 位数字";
    messages.push(fieldErrors.parentNo);
  }
  if (!form.name.trim()) {
    fieldErrors.name = "请输入家长姓名";
    messages.push(fieldErrors.name);
  } else if (form.name.trim().length > 50) {
    fieldErrors.name = "家长姓名不能超过 50 个字符";
    messages.push(fieldErrors.name);
  }
  if (!isEditing.value && !form.mobile.trim()) {
    fieldErrors.mobile = "请输入手机号";
    messages.push(fieldErrors.mobile);
  } else if (form.mobile.trim() && !MEMBER_MOBILE_RE.test(form.mobile.trim())) {
    fieldErrors.mobile = "手机号格式不正确";
    messages.push(fieldErrors.mobile);
  }
  const birthday = form.birthday.trim();
  if (birthday && !isValidBirthdayText(birthday)) {
    fieldErrors.birthday = "出生日期格式应为 YYYY-MM-DD";
    messages.push(fieldErrors.birthday);
  } else if (birthday && birthday > todayText()) {
    fieldErrors.birthday = "出生日期不能晚于今天";
    messages.push(fieldErrors.birthday);
  }
  const idNo = form.idNo.trim();
  if (idNo && !MEMBER_ID_NO_RE.test(idNo)) {
    fieldErrors.idNo = "身份证号应为 18 位";
    messages.push(fieldErrors.idNo);
  } else if (idNo) {
    if (!birthday) {
      fieldErrors.idNo = "填写身份证时必须填写出生日期";
      messages.push(fieldErrors.idNo);
    } else if (!idNoMatchesBirthday(idNo, birthday)) {
      fieldErrors.idNo = "身份证号与出生日期不一致";
      messages.push(fieldErrors.idNo);
    }
  }
  if (form.remark.length > 500) {
    fieldErrors.remark = "备注不能超过 500 个字符";
    messages.push(fieldErrors.remark);
  }
  errors.value = messages;
  return messages.length === 0;
}

function validateChildren(): boolean {
  const messages: string[] = [];
  const seenIdNo = new Set<string>();
  for (const [index, row] of rows.value.entries()) {
    const prefix = `第 ${index + 1} 名子女：`;
    row.errors.name = "";
    row.errors.gender = "";
    row.errors.relation = "";
    row.errors.birthday = "";
    row.errors.idNo = "";
    if (!row.name.trim()) {
      row.errors.name = "请输入子女姓名";
      messages.push(`${prefix}${row.errors.name}`);
    } else if (row.name.trim().length > 50) {
      row.errors.name = "子女姓名不能超过 50 个字符";
      messages.push(`${prefix}${row.errors.name}`);
    }
    if (!row.gender) {
      row.errors.gender = "请选择子女性别";
      messages.push(`${prefix}${row.errors.gender}`);
    }
    if (!row.relation) {
      row.errors.relation = "请选择与家长关系";
      messages.push(`${prefix}${row.errors.relation}`);
    }
    const birthday = row.birthday.trim();
    if (!birthday) {
      row.errors.birthday = "请填写出生日期";
      messages.push(`${prefix}${row.errors.birthday}`);
    } else if (!isValidBirthdayText(birthday)) {
      row.errors.birthday = "出生日期格式应为 YYYY-MM-DD";
      messages.push(`${prefix}${row.errors.birthday}`);
    } else if (birthday > todayText()) {
      row.errors.birthday = "出生日期不能晚于今天";
      messages.push(`${prefix}${row.errors.birthday}`);
    }
    const idNo = row.idNo.trim().toUpperCase();
    if (!idNo) {
      row.errors.idNo = "请填写子女身份证号";
      messages.push(`${prefix}${row.errors.idNo}`);
    } else if (!MEMBER_ID_NO_RE.test(idNo)) {
      row.errors.idNo = "身份证号应为 18 位";
      messages.push(`${prefix}${row.errors.idNo}`);
    } else if (birthday && !idNoMatchesBirthday(idNo, birthday)) {
      row.errors.idNo = "身份证号与出生日期不一致";
      messages.push(`${prefix}${row.errors.idNo}`);
    } else if (seenIdNo.has(idNo)) {
      row.errors.idNo = "同一批子女身份证号不能重复";
      messages.push(`${prefix}${row.errors.idNo}`);
    } else {
      seenIdNo.add(idNo);
    }
  }
  errors.value = messages;
  return messages.length === 0;
}

function buildChildPayload(row: ChildRowState): TalentMemberChildCreateInput {
  return {
    name: row.name.trim(),
    gender: row.gender as TalentMemberGender,
    relation: row.relation,
    birthday: row.birthday.trim(),
    idNo: row.idNo.trim().toUpperCase(),
  };
}

async function handleSave(): Promise<void> {
  if (saving.value) return;
  if (!validateParent()) {
    message.warning(errors.value[0] || "请检查家长资料");
    return;
  }
  if (!isEditing.value && !validateChildren()) {
    message.warning(errors.value[0] || "请检查子女资料");
    return;
  }
  saving.value = true;
  try {
    if (isEditing.value) {
      const body: TalentMemberUpdateInput = {
        name: form.name.trim(),
        gender: form.gender,
        remark: form.remark,
      };
      if (form.birthday.trim() !== String(props.record?.birthday || ""))
        body.birthday = form.birthday.trim();
      if (form.mobile.trim()) body.mobile = form.mobile.trim();
      if (form.idNo.trim()) body.idNo = form.idNo.trim().toUpperCase();
      await api.updateMember(props.record!.id, body);
    } else {
      const body: TalentMemberCreateInput = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        children: rows.value.map(buildChildPayload),
      };
      if (form.parentNo.trim()) body.parentNo = form.parentNo.trim();
      if (form.gender) body.gender = form.gender;
      if (form.birthday.trim()) body.birthday = form.birthday.trim();
      if (form.idNo.trim()) body.idNo = form.idNo.trim().toUpperCase();
      if (form.remark.trim()) body.remark = form.remark.trim();
      await api.createMember(body);
    }
    emit("update:show", false);
    emit("saved");
  } catch {
    // useApi 已统一提示服务端错误（409 手机号 / 编号 / 证件冲突，422 校验失败）。
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.show,
  (show) => {
    if (show) reset();
  },
  { immediate: true },
);
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    :title="title"
    style="width: min(980px, calc(100vw - 32px))"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <div class="member-form-body">
      <n-alert v-if="errors.length" type="error" :show-icon="false" class="error-banner">
        <div v-for="item in errors" :key="item">{{ item }}</div>
      </n-alert>

      <n-form label-placement="top">
        <div class="form-grid">
          <n-form-item
            label="家长姓名"
            required
            :validation-status="fieldErrors.name ? 'error' : undefined"
            :feedback="fieldErrors.name"
          >
            <n-input v-model:value="form.name" :maxlength="50" placeholder="家长姓名" />
          </n-form-item>
          <n-form-item
            :label="isEditing ? '手机号（留空不修改）' : '手机号'"
            :required="!isEditing"
            :validation-status="fieldErrors.mobile ? 'error' : undefined"
            :feedback="fieldErrors.mobile"
          >
            <n-input
              v-model:value="form.mobile"
              :maxlength="11"
              :placeholder="isEditing ? `原号码 ${props.record?.maskedMobile || '—'}，不修改请留空` : '11 位手机号'"
            />
          </n-form-item>
          <n-form-item
            :label="isEditing ? '家长身份证（留空不修改）' : '家长身份证（选填）'"
            :validation-status="fieldErrors.idNo ? 'error' : undefined"
            :feedback="fieldErrors.idNo"
          >
            <n-input
              v-model:value="form.idNo"
              :maxlength="18"
              :placeholder="isEditing ? `原证件 ${props.record?.maskedIdNo || '未填写'}，不修改请留空` : '18 位身份证号'"
            />
          </n-form-item>
          <n-form-item label="性别">
            <n-select v-model:value="form.gender" :options="parentGenderOptions" />
          </n-form-item>
          <n-form-item
            label="出生日期"
            :validation-status="fieldErrors.birthday ? 'error' : undefined"
            :feedback="fieldErrors.birthday"
          >
            <n-input v-model:value="form.birthday" :maxlength="10" placeholder="YYYY-MM-DD" />
          </n-form-item>
          <n-form-item
            :label="isEditing ? '会员编号（不可修改）' : '会员编号（选填）'"
            :validation-status="fieldErrors.parentNo ? 'error' : undefined"
            :feedback="fieldErrors.parentNo"
          >
            <n-input
              v-model:value="form.parentNo"
              :disabled="isEditing"
              :maxlength="13"
              placeholder="P202611160001"
            />
          </n-form-item>
          <n-form-item class="form-full" label="备注">
            <n-input
              v-model:value="form.remark"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              :maxlength="500"
              placeholder="可选，最多 500 字"
            />
          </n-form-item>
        </div>

        <template v-if="!isEditing">
          <div class="children-head">
            <div class="children-title">
              <b>名下子女</b>
              <span>至少 1 名、最多 10 名；保存后自动发起基因查询</span>
            </div>
            <n-button size="small" :disabled="!canAddChild" @click="addChild">添加子女</n-button>
          </div>

          <div
            v-for="(row, index) in rows"
            :key="row.key"
            class="child-row"
            :aria-label="`第 ${index + 1} 名子女`"
          >
            <div class="child-row-head">
              <span class="child-index">子女 {{ index + 1 }}</span>
              <n-button
                size="tiny"
                quaternary
                type="error"
                :disabled="rows.length <= 1"
                @click="removeChild(row.key)"
              >
                移除
              </n-button>
            </div>
            <div class="child-grid">
              <n-form-item
                label="姓名"
                required
                :validation-status="row.errors.name ? 'error' : undefined"
                :feedback="row.errors.name"
              >
                <n-input v-model:value="row.name" :maxlength="50" placeholder="子女姓名" />
              </n-form-item>
              <n-form-item
                label="性别"
                required
                :validation-status="row.errors.gender ? 'error' : undefined"
                :feedback="row.errors.gender"
              >
                <n-select v-model:value="row.gender" :options="genderOptions" placeholder="性别" />
              </n-form-item>
              <n-form-item
                label="与家长关系"
                required
                :validation-status="row.errors.relation ? 'error' : undefined"
                :feedback="row.errors.relation"
              >
                <n-select v-model:value="row.relation" :options="relationOptions" placeholder="关系" />
              </n-form-item>
              <n-form-item
                label="出生日期"
                required
                :validation-status="row.errors.birthday ? 'error' : undefined"
                :feedback="row.errors.birthday"
              >
                <n-input v-model:value="row.birthday" :maxlength="10" placeholder="YYYY-MM-DD" />
              </n-form-item>
              <n-form-item
                label="身份证号"
                required
                :validation-status="row.errors.idNo ? 'error' : undefined"
                :feedback="row.errors.idNo"
              >
                <n-input v-model:value="row.idNo" :maxlength="18" placeholder="18 位身份证号" />
              </n-form-item>
            </div>
          </div>
        </template>

        <p v-else class="edit-hint">
          名下子女在详情「名下子女」页签中就地维护；会员编号与已登记的手机号 / 身份证不在此处直接回显。
        </p>
      </n-form>
    </div>

    <template #footer>
      <div class="form-footer">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">
          {{ isEditing ? "保存会员资料" : "创建会员" }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.member-form-body { max-height: 64vh; overflow: auto; padding-right: 4px; }
.error-banner { margin-bottom: 14px; line-height: 1.7; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 20px; }
.form-full { grid-column: 1 / -1; }
.children-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 14px 0 8px;
  margin-top: 6px;
  border-top: 1px solid var(--border);
}
.children-title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; min-width: 0; }
.children-title b { color: var(--foreground); font-size: 14px; font-weight: 600; }
.children-title span { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.child-row { padding: 8px 0 2px; border-bottom: 1px dashed var(--border); }
.child-row:last-of-type { border-bottom: none; }
.child-row-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.child-index { color: var(--muted-foreground, #6c756a); font-size: 12px; }
.child-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0 14px; }
.edit-hint { margin: 12px 0 0; color: var(--muted-foreground, #6c756a); font-size: 12px; line-height: 1.7; }
.form-footer { display: flex; justify-content: flex-end; gap: 12px; }
.form-footer :deep(.n-button) { min-height: 44px; }
@media (max-width: 900px) {
  .child-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .child-grid { grid-template-columns: 1fr; }
}
</style>