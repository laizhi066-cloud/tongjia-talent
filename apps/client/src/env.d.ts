/**
 * @description C 端 Vite 环境变量声明。
 * @file src/env.d.ts
 */
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent
  export default component
}

interface ImportMetaEnv {
  /** 网站标题，应用名称 */
  readonly VITE_APP_TITLE: string
  /** 客户端版本号（关于页展示） */
  readonly VITE_APP_VERSION?: string
  /** 后台接口地址 */
  readonly VITE_SERVER_BASEURL: string
  /** H5是否需要代理 */
  readonly VITE_APP_PROXY_ENABLE: 'true' | 'false'
  /** H5是否需要代理，需要的话有个前缀 */
  readonly VITE_APP_PROXY_PREFIX: string
  /** 微信开发环境接口地址，必须是完整可访问 URL */
  readonly VITE_SERVER_BASEURL__WEIXIN_DEVELOP?: string
  /** 微信体验版接口地址，必须是完整 HTTPS URL */
  readonly VITE_SERVER_BASEURL__WEIXIN_TRIAL?: string
  /** 微信正式版接口地址，必须是完整 HTTPS URL */
  readonly VITE_SERVER_BASEURL__WEIXIN_RELEASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
