/**
 * @description 基础门户 H5 与微信小程序的 Vite / uni-app 构建配置。
 * @file vite.config.ts
 */
import path from 'node:path'
import process from 'node:process'
import Uni from '@uni-helper/plugin-uni'
import UniComponents from '@uni-helper/vite-plugin-uni-components'
// @see https://github.com/uni-helper/vite-plugin-uni-manifest
import UniManifest from '@uni-helper/vite-plugin-uni-manifest'
// @see https://uni-helper.js.org/vite-plugin-uni-pages
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import { WotResolver } from './wot-ui-resolver'
import { defineConfig, loadEnv } from 'vite'

/** 构建命令依据 mode 加载 env 目录中的对应环境变量。 */
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(process.cwd(), 'env')
  const env = loadEnv(mode, envDir)
  const {
    VITE_APP_PORT,
    VITE_SERVER_BASEURL,
    VITE_DELETE_CONSOLE,
    VITE_APP_PUBLIC_BASE,
    VITE_APP_PROXY_ENABLE,
    VITE_APP_PROXY_PREFIX,
    VITE_SHOW_SOURCEMAP,
  } = env

  return defineConfig({
    envDir: './env',
    base: VITE_APP_PUBLIC_BASE,
    plugins: [
      UniManifest(),
      UniComponents({
        extensions: ['vue'],
        deep: true,
        directoryAsNamespace: false,
        dts: 'src/types/components.d.ts',
        resolvers: [WotResolver()],
      }),
      UniPages({
        exclude: ['**/components/**/**.*', '**/sections/**/**.*'],
        dts: 'src/types/uni-pages.d.ts',
        // 4 主栏结构下首页固定为 pages/home/index（M7 spec §2.2）。
        homePage: 'pages/home/index',
      }),
      Uni(),
      {
        // 规避 uni-app 编译器与 Vue devtools 模板选项的已知冲突。
        name: 'fix-vite-plugin-vue',
        configResolved(config) {
          const plugin = config.plugins.find(p => p.name === 'vite:vue')
          if (plugin && plugin.api && plugin.api.options) {
            plugin.api.options.devToolsEnabled = false
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.join(process.cwd(), './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      hmr: true,
      port: Number.parseInt(VITE_APP_PORT, 10),
      proxy: JSON.parse(VITE_APP_PROXY_ENABLE)
        ? {
            [VITE_APP_PROXY_PREFIX]: {
              target: VITE_SERVER_BASEURL,
              changeOrigin: true,
              rewrite: path =>
                path.replace(new RegExp(`^${VITE_APP_PROXY_PREFIX}`), ''),
            },
          }
        : undefined,
    },
    esbuild: {
      // 保留 console.error，方便定位小程序合法域名、接口地址和授权失败；仅移除普通调试输出。
      drop: VITE_DELETE_CONSOLE === 'true' ? ['debugger'] : [],
      pure: VITE_DELETE_CONSOLE === 'true' ? ['console.log', 'console.info', 'console.debug', 'console.trace'] : [],
    },
    build: {
      sourcemap: VITE_SHOW_SOURCEMAP === 'true',
      target: 'es6',
      minify: mode === 'development' ? false : 'esbuild',
    },
  })
})
