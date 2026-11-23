/**
 * @description C 端应用入口，注册 Pinia 与基础请求、路由拦截器。
 * @file src/main.ts
 */
import { createSSRApp } from 'vue'
import App from './App.vue'
import { requestInterceptor } from './http/interceptor'
import { routeInterceptor } from './router/interceptor'
import store from './store'
import '@/style/index.scss'

/** 创建 uni-app 应用实例。 */
export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  app.use(routeInterceptor)
  app.use(requestInterceptor)

  return { app }
}
