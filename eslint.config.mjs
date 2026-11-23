// @ts-check
import tsParser from '@typescript-eslint/parser'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // 忽略非项目代码
    ignores: [
      '.claude/',
      'pocketbase/',
      'test_output.mjs',
      '.output/',
      '.nuxt/',
      '.vercel/',
      '.codex/',
      '/dist/', // 仅忽略构建产物 ./dist/（前导 / 锚定根，不误伤 server/api/**/dist/** 路由）
      // Nuxt gitignore 集成把 .gitignore 的 /dist 转成了非锚定 dist → 误伤整个分销 API 路由；显式反忽略拉回 lint
      '!**/server/api/admin/dist/**',
      '!**/server/api/dist/**',
      'pb_data/',
      'pb_data.backup-*/',
      'outputs/', // 用户生成的推广册/PDF 辅助资产，不属于项目源码
      // 客户交付的静态原型（历史资产，非项目源码）；其 JS 不参与工程 lint。
      'docs/天赋正式开发交接包/talent-prototype*/',
    ],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },
  // PocketBase 迁移文件 — 添加全局变量
  {
    files: ['pocketbase/pb_migrations/**/*.js'],
    languageOptions: {
      globals: {
        migrate: 'readonly',
        Collection: 'readonly',
        Field: 'readonly',
        Dao: 'readonly',
      },
    },
  },
).overrideRules({
  // 允许 Vue 单文件组件名称为单个词（如 index.vue）
  'vue/multi-word-component-names': 'off',

  // 类型安全规则 — 设为 warn，不阻塞开发，但提示逐步改进
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-empty-object-type': 'warn',
  '@typescript-eslint/no-unsafe-declaration-merging': 'warn',
  '@typescript-eslint/no-extraneous-class': 'warn',
  '@typescript-eslint/no-wrapper-object-types': 'warn',
  '@typescript-eslint/ban-ts-comment': 'warn',

  // 允许使用 require（后端代码兼容）
  '@typescript-eslint/no-require-imports': 'off',

  // 处理 void 类型兼容性
  '@typescript-eslint/no-invalid-void-type': 'warn',

  // Vue 3 支持多根元素 Fragment
  'vue/no-multiple-template-root': 'off',
  // AI 聊天页已用 escapeHtml 做 XSS 防护
  'vue/no-v-html': 'off',
})
