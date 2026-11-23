import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~/config': resolve(__dirname, 'app/config'),
      '~~': resolve(__dirname), // Nuxt rootDir 别名，须与 Nitro 一致
      '~': resolve(__dirname),
      '#shared': resolve(__dirname, 'shared'), // Nuxt 4 shared/ 别名（服务端/客户端共用工具，如 formula-engine）
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
