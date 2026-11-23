/**
 * @description 基础版请求拦截器占位，所有认证头由 http 封装统一注入。
 * @file src/http/interceptor.ts
 */

/** 安装请求拦截器；保留应用入口契约，避免引入任何业务上下文。 */
export const requestInterceptor = {
  install(): void {},
}
