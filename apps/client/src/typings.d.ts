/**
 * @description 支持在 uni-app 模板中使用全局 `uni` 对象。
 * @file src/typings.d.ts
 */
declare module 'vue' {
  interface ComponentCustomProperties {
    uni: typeof uni
  }
}

export {}
