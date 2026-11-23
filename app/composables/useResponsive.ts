/**
 * @description 响应式断点 composable — 监听视口宽度，提供响应式状态
 * @file app/composables/useResponsive.ts
 */
export const breakpoints = {
  mobile: 640,   // matches Tailwind sm
  tablet: 768,   // matches Tailwind md
  desktop: 1024, // matches Tailwind lg
  wide: 1280,    // matches Tailwind xl
}

export function useResponsive() {
  const width = ref(import.meta.client ? window.innerWidth : 1280)

  const isMobile = computed(() => width.value < breakpoints.mobile)
  const isTablet = computed(() => width.value >= breakpoints.mobile && width.value < breakpoints.tablet)
  const isDesktop = computed(() => width.value >= breakpoints.desktop && width.value < breakpoints.wide)
  const isWide = computed(() => width.value >= breakpoints.wide)
  // 视口低于 lg(1024)：内联侧边栏被 `hidden lg:flex` 隐藏，导航需走抽屉
  const isBelowDesktop = computed(() => width.value < breakpoints.desktop)

  let resizeHandler: (() => void) | null = null
  onMounted(() => {
    width.value = window.innerWidth
    resizeHandler = () => { width.value = window.innerWidth }
    window.addEventListener('resize', resizeHandler)
  })
  onUnmounted(() => {
    if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  })

  return { width, isMobile, isTablet, isDesktop, isWide, isBelowDesktop }
}
