<!--
/**
 * @description 基础后台管理员邮箱密码登录页面。
 * @file app/pages/login/index.vue
 */
-->
<script setup lang="ts">
import EyeOffOutline from "@vicons/ionicons5/es/EyeOffOutline";
import EyeOutline from "@vicons/ionicons5/es/EyeOutline";
import LockClosedOutline from "@vicons/ionicons5/es/LockClosedOutline";
import AtOutline from "@vicons/ionicons5/es/AtOutline";
import { shallowRef, watch } from "vue";
import { NInput, NButton, NIcon, useMessage } from "naive-ui";

definePageMeta({ middleware: "guest", ssr: false });

const authSession = useAuthSession();
const message = useMessage();
const route = useRoute();
useTheme();

const identity = shallowRef("");
const password = shallowRef("");
const loading = shallowRef(false);
const showPassword = shallowRef(false);
const formError = shallowRef("");

watch([identity, password], () => {
  if (formError.value) formError.value = "";
});

/** 基础后台接受管理员账号名或邮箱。 */
function validateIdentity(value: string): string | null {
  if (!value) return "请输入管理员账号";
  if (value.length < 3) return "账号至少需要 3 位";
  return null;
}

function reportFormError(text: string): void {
  formError.value = text;
  message.error(text);
}

async function handleLogin() {
  if (loading.value) return;

  const identityValue = identity.value.trim();
  const err = validateIdentity(identityValue);
  if (err) {
    reportFormError(err);
    return;
  }
  if (!password.value) {
    reportFormError("请输入密码");
    return;
  }
  if (password.value.length < 8) {
    reportFormError("密码长度不能少于 8 位");
    return;
  }

  formError.value = "";
  loading.value = true;

  try {
    // prettier-ignore
    const res = await useAuthApi().adminLogin({ identity: identityValue, password: password.value });
    authSession.save(res.token, res.record);

    // 通知全局 auth 状态：已登录
    useAuthState().setAuthenticated();

    await useMonitorApi()
      .recordOnline()
      .catch(() => {});

    const requestedPath = safeAdminRedirect(route.query.redirect);
    const bootstrap = await useBootstrapApi().fetchBootstrap().then((data) => {
      useBootstrapCache().setBootstrapCache(data);
      return data;
    }).catch(() => null);
    const target = requestedPath === "/admin" ? getAdminLandingPath(bootstrap) : requestedPath;
    await navigateTo(target);
  } catch (e: any) {
    reportFormError(getApiErrorMessage(e, "登录失败，请检查账号或网络后重试"));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ClientOnly>
    <AuthCard title="欢迎回来" subtitle="登录你的账户">
      <form class="auth-form" novalidate @submit.prevent="handleLogin">
        <div
          v-if="formError"
          class="auth-alert"
          role="alert"
          aria-live="assertive"
        >
          {{ formError }}
        </div>

        <div class="auth-field">
          <label class="auth-label" for="login-identity">账号</label>
          <n-input
            v-model:value="identity"
            class="auth-input"
            size="large"
            placeholder="账号或邮箱"
            :input-props="{ id: 'login-identity', autocomplete: 'username' }"
          >
            <template #prefix>
              <n-icon :component="AtOutline" class="auth-input-icon" />
            </template>
          </n-input>
          <div class="auth-help">支持管理员账号名或邮箱登录，需已分配后台角色</div>
        </div>

        <div class="auth-field">
          <label class="auth-label" for="login-password">密码</label>
          <n-input
            v-model:value="password"
            class="auth-input"
            size="large"
            :type="showPassword ? 'text' : 'password'"
            placeholder="输入密码（至少 8 位）"
            :input-props="{ id: 'login-password', autocomplete: 'current-password' }"
          >
            <template #prefix>
              <n-icon :component="LockClosedOutline" class="auth-input-icon" />
            </template>
            <template #suffix>
              <button
                class="auth-password-toggle"
                type="button"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <n-icon
                  :component="showPassword ? EyeOffOutline : EyeOutline"
                />
              </button>
            </template>
          </n-input>
        </div>

        <n-button
          class="auth-submit"
          type="primary"
          attr-type="submit"
          :loading="loading"
          :disabled="loading"
        >
          {{ loading ? "登录中..." : "登录" }}
        </n-button>
      </form>
    </AuthCard>

    <template #fallback>
      <div class="login-fallback">
        <div class="text-center">
          <div class="mb-4 flex justify-center">
            <img
              class="login-fallback__logo-image"
              src="/brand/tongjia-talent-mark.svg"
              alt="同佳天赋"
            >
          </div>
          <div class="login-fallback__brand">同佳天赋管理后台</div>
          <div class="login-fallback__text">加载中...</div>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.login-fallback {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: var(--background);
}

.login-fallback__logo-image {
  display: block;
  width: 52px;
  height: 52px;
  border-radius: 12px;
}

.login-fallback__brand {
  color: var(--primary);
  font-size: 14px;
  font-weight: 600;
}

.login-fallback__text {
  margin-top: 8px;
  color: var(--muted-foreground);
  font-size: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.auth-alert {
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--destructive, #dc2626) 35%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--destructive, #dc2626) 8%, var(--card));
  color: var(--destructive, #dc2626);
  font-size: 13px;
  line-height: 1.45;
}

.auth-field {
  display: grid;
  gap: 8px;
}

.auth-label {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
}

.auth-help {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.45;
}

.auth-input-icon {
  margin-right: 4px;
  color: color-mix(in srgb, var(--primary) 55%, var(--muted-foreground));
  font-size: 17px;
}

.auth-input {
  --auth-input-bg: color-mix(in srgb, var(--card) 88%, var(--muted));
}

.auth-input :deep(.n-input-wrapper) {
  min-height: 46px;
}

.auth-input :deep(.n-input__input-el) {
  font-size: 15px;
}

.auth-input :deep(.n-input__border) {
  border-color: color-mix(in srgb, var(--border) 82%, var(--primary));
}

.auth-input :deep(.n-input__state-border) {
  border-width: 1.5px;
}

.auth-input :deep(.n-input__placeholder) {
  color: color-mix(in srgb, var(--muted-foreground) 82%, var(--foreground));
}

.auth-input :deep(.n-input__input),
.auth-input :deep(.n-input__textarea) {
  background: var(--auth-input-bg);
}

.auth-password-toggle {
  padding: 0;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: -9px -9px -9px 0;
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0.78;
  transition:
    color 180ms ease,
    opacity 180ms ease;
}

.auth-password-toggle:hover {
  color: var(--primary);
  opacity: 1;
}

.auth-password-toggle:focus-visible {
  border-radius: 8px;
  outline: 2px solid var(--ring, var(--primary));
  outline-offset: -2px;
}

.auth-submit {
  width: 100%;
  height: 46px;
  margin-top: 2px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary) 24%, transparent);
}
</style>
