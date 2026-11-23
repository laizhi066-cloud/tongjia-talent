/** * @description 基础后台管理员邮箱密码登录页面。 * @file
app/pages/login/index.vue */
<script setup lang="ts">
import EyeOffOutline from "@vicons/ionicons5/es/EyeOffOutline";
import EyeOutline from "@vicons/ionicons5/es/EyeOutline";
import LockClosedOutline from "@vicons/ionicons5/es/LockClosedOutline";
import AtOutline from "@vicons/ionicons5/es/AtOutline";
import { shallowRef } from "vue";
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

/** 基础后台接受管理员账号名或邮箱。 */
function validateIdentity(identity: string): string | null {
  if (!identity) return "请输入管理员账号";
  if (identity.length < 3) return "账号至少需要 3 位";
  return null;
}

async function handleLogin() {
  const identityValue = identity.value.trim();
  const err = validateIdentity(identityValue);
  if (err) {
    message.error(err);
    return;
  }
  if (!password.value) {
    message.error("请输入密码");
    return;
  }
  if (password.value.length < 8) {
    message.error("密码长度不能少于8位");
    return;
  }

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
      useBootstrapCache().setBootstrapCache(data)
      return data
    }).catch(() => null);
    const target = requestedPath === '/admin' ? getAdminLandingPath(bootstrap) : requestedPath;
    await navigateTo(target);
  } catch (e: any) {
    message.error(getApiErrorMessage(e, "登录失败，请重试"));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ClientOnly>
    <AuthCard title="欢迎回来" subtitle="登录你的账户">
      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="auth-field">
          <div class="auth-label">账号</div>
          <div class="auth-input-wrap">
            <n-icon :component="AtOutline" class="auth-input-icon" />
            <n-input
              v-model:value="identity"
              class="auth-input"
              size="large"
              placeholder="账号或邮箱"
              style="padding-left: 36px"
              autocomplete="username"
            />
          </div>
          <div class="auth-help">支持管理员账号名或邮箱登录，需已分配后台角色</div>
        </div>

        <div class="auth-field">
          <div class="auth-label">密码</div>
          <div class="auth-input-wrap">
            <n-icon :component="LockClosedOutline" class="auth-input-icon" />
            <n-input
              v-model:value="password"
              class="auth-input"
              size="large"
              :type="showPassword ? 'text' : 'password'"
              placeholder="输入密码（至少8位）"
              autocomplete="current-password"
              style="padding-left: 36px"
            >
              <template #suffix>
                <button
                  class="auth-password-toggle"
                  type="button"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  @click="showPassword = !showPassword"
                >
                  <n-icon
                    :component="showPassword ? EyeOffOutline : EyeOutline"
                  />
                </button>
              </template>
            </n-input>
          </div>
        </div>

        <n-button
          class="auth-submit"
          type="primary"
          attr-type="submit"
          :loading="loading"
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

<style>
/* 关键内联 CSS — 防止刷新闪烁 */
.auth-wrapper {
  background: var(--background);
}
.auth-card {
  background: var(--card) !important;
}
.auth-logo {
  background: var(--primary);
  color: var(--primary-foreground);
}
.auth-site-name {
  color: var(--primary);
}
.auth-link {
  color: var(--primary);
}

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
  gap: 22px;
}

.auth-field {
  display: grid;
  gap: 9px;
}

.auth-label {
  color: var(--foreground);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.3;
}

.auth-help {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.4;
}

.auth-input-wrap {
  position: relative;
}

.auth-input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  z-index: 1;
  color: color-mix(in srgb, var(--primary) 50%, var(--muted-foreground));
  font-size: 17px;
  pointer-events: none;
  transform: translateY(-50%);
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
  opacity: 0.72;
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
  outline: 2px solid var(--ring);
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
