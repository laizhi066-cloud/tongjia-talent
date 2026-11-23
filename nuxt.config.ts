/**
 * @description Nuxt 基础版运行时与构建配置。
 * @file nuxt.config.ts
 */
import type { NuxtPage } from '@nuxt/schema'
import tailwindcss from '@tailwindcss/vite'

const defaultPocketBaseUrl = 'http://127.0.0.1:8090'
const privatePocketBaseUrl = process.env.POCKETBASE_URL || process.env.NUXT_PUBLIC_POCKETBASE_URL || defaultPocketBaseUrl
const publicPocketBaseUrl = process.env.NUXT_PUBLIC_POCKETBASE_URL || defaultPocketBaseUrl
const appBaseUrl = process.env.NUXT_APP_BASE_URL || '/'
// public/ 下的静态文件不会自动带上 app.baseURL；子路径部署时必须显式使用完整站内路径。
const faviconPath = `/${[appBaseUrl, 'favicon.svg'].join('/').replace(/\/+/g, '/').replace(/^\/+/, '')}`

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  typescript: {
    includeWorkspace: true,
    tsConfig: {
      // uni-app 使用独立的 Vue/Volar 配置，不参与 Nuxt 类型检查。
      exclude: ['../pocketbase/pb_migrations/**/*', '../apps/client/**/*'],
    },
  },

  devServer: { host: '0.0.0.0', port: 3000 },

  vite: {
    build: { sourcemap: false },
    optimizeDeps: {
      include: [
        '@vicons/ionicons5',
        '@vicons/ionicons5/es/AtOutline',
        '@vicons/ionicons5/es/EyeOffOutline',
        '@vicons/ionicons5/es/EyeOutline',
        '@vicons/ionicons5/es/LockClosedOutline',
        '@vicons/ionicons5/es/PersonOutline',
        '@vicons/ionicons5/es/PhonePortraitOutline',
        // 这些依赖由上传裁剪器、图标注册表在开发期动态发现。
        // 预构建后避免首次访问对应页面时触发整页 reload。
        'lucide-vue-next',
        'vue-advanced-cropper',
      ],
    },
    plugins: [tailwindcss() as any],
  },

  build: {
    transpile: ['naive-ui', 'vueuc', 'seemly', 'vdirs'],
  },

  css: [
    '~/assets/css/critical.css',
    '~/assets/css/tailwind.css',
    '~/assets/css/fonts.css',
    '~/assets/css/main.scss',
  ],

  runtimeConfig: {
    pocketbaseAdminEmail: process.env.POCKETBASE_ADMIN_EMAIL || '',
    pocketbaseAdminPassword: process.env.POCKETBASE_ADMIN_PASSWORD || '',
    talentAiBaseUrl: process.env.TALENT_AI_BASE_URL || '',
    talentAiApiKey: process.env.TALENT_AI_API_KEY || '',
    talentAiModel: process.env.TALENT_AI_MODEL || 'deepseek-chat',
    talentAiProtocol: process.env.TALENT_AI_PROTOCOL || 'anthropic',
    // 服务端使用绝对地址；浏览器公开地址可配置为反向代理路径。
    pocketbaseUrl: privatePocketBaseUrl,
    public: {
      pocketbaseUrl: publicPocketBaseUrl,
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
      h5Base: process.env.NUXT_PUBLIC_H5_BASE || 'http://127.0.0.1:9000',
      versionUpdatedAt: process.env.NUXT_PUBLIC_VERSION_UPDATED_AT || new Date().toISOString(),
    },
  },

  nitro: {
    preset: 'node-server',
    errorHandler: './server/utils/errorHandler',
    typescript: {
      tsConfig: {
        exclude: ['../pocketbase/pb_migrations/**/*'],
      },
    },
    routeRules: {
      '/api/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      },
    },
  },

  app: {
    baseURL: appBaseUrl,
    head: {
      link: [
        { key: 'default-favicon', rel: 'icon', type: 'image/svg+xml', href: faviconPath },
      ],
      meta: [
        { name: 'description', content: '基础管理台' },
        { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
        { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      ],
      script: [{
        innerHTML: `(function(){try{var r=localStorage.getItem("foundation-css-vars");if(!r)return;var v=JSON.parse(r),e=document.documentElement;for(var k in v)e.style.setProperty(k,v[k]);localStorage.getItem("foundation-dark")==="true"?e.classList.add("dark"):e.classList.remove("dark")}catch(e){}})()`,
      }],
      style: [{
        innerHTML: `*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--background);color:var(--foreground);-webkit-font-smoothing:antialiased}#__nuxt{min-height:100vh}`,
      }],
    },
  },

  components: [
    { path: '~/components' },
    { path: '~/pages', pattern: '**/components/**', pathPrefix: false },
  ],

  hooks: {
    'pages:extend'(pages) {
      /** @param routePages Nuxt 路由树。 */
      function removePageComponents(routePages: NuxtPage[] = []) {
        const pagesToRemove = routePages.filter(page => page.file && /[\\/]pages[\\/].*[\\/]components[\\/]/.test(page.file))
        for (const page of pagesToRemove)
          routePages.splice(routePages.indexOf(page), 1)
        for (const page of routePages)
          removePageComponents(page.children)
      }

      removePageComponents(pages)
    },
  },

  imports: {
    dirs: ['composables/api'],
  },

  modules: ['nuxtjs-naive-ui', '@nuxt/eslint'],
})
