import uniHelper from '@uni-helper/eslint-config'

export default uniHelper({
  unocss: false,
  vue: true,
  markdown: false,
  ignores: [
    // 忽略uni_modules目录
    '**/uni_modules/',
    // 忽略原生插件目录
    '**/nativeplugins/',
    '.omc/',
    '.codegraph/',
    'node_modules/',
    'dist',
    // vite-plugin-uni-pages 生成的类型文件，每次切换分支都一堆不同的，所以直接 .gitignore
    'uni-pages.d.ts',
    // 插件生成的文件
    'src/pages.json',
    'src/manifest.json',
    // 忽略自动生成文件
    'src/service/**',
    'src/generated/**', // B→C 生成契约（nuxt-admin contract:generate 产物，禁止手改）
    // 纯 Node 部署脚本（build/scp/ssh 编排，非 app 代码；antfu app 风格规则不适用，命中项均为风格、无正确性规则）
    'scripts/deploy.mjs',
  ],
  // https://eslint-config.antfu.me/rules
  rules: {
    'no-useless-return': 'off',
    'no-console': 'off',
    'no-unused-vars': 'off',
    'vue/no-unused-refs': 'off',
    'unused-imports/no-unused-vars': 'off',
    'eslint-comments/no-unlimited-disable': 'off',
    'jsdoc/check-param-names': 'off',
    'jsdoc/require-returns-description': 'off',
    'ts/no-empty-object-type': 'off',
    'no-extend-native': 'off',
    // uni 条件编译注释可能包裹 import，自动排序会破坏平台条件边界
    'perfectionist/sort-imports': 'off',
    'vue/singleline-html-element-content-newline': [
      'error',
      {
        externalIgnores: ['text'],
      },
    ],
    // vue SFC 调换顺序改这里
    'vue/block-order': ['error', {
      order: [['script', 'template'], 'style'],
    }],
  },
  formatters: {
    /**
     * Format CSS, LESS, SCSS files, also the `<style>` blocks in Vue
     * By default uses Prettier
     */
    css: true,
    /**
     * Format HTML files
     * By default uses Prettier
     */
    html: true,
  },
})
