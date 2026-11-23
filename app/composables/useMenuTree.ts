/**
 * @description 基础后台菜单树：仅渲染当前授权菜单和已登记业务入口。
 * @file app/composables/useMenuTree.ts
 */
import { h, type Component } from 'vue'
import { NIcon, type MenuOption } from 'naive-ui'

interface AdminMenuNode {
  key: string
  label: string
  path?: string
  icon?: string
  children?: AdminMenuNode[]
}

const FOUNDATION_PATHS = [
  '/admin',
  '/admin/profile',
  '/admin/user',
  '/admin/role',
  '/admin/menu',
  '/admin/dept',
  '/admin/post',
  '/admin/dict',
  '/admin/config',
  '/admin/site-config',
  '/admin/settings/wechat',
  '/admin/monitor/health',
  '/admin/monitor/error',
  '/admin/monitor/online',
  '/admin/log/login-log',
  '/admin/log/oper-log',
]

const TALENT_PATHS = [
  '/admin/talent/dashboard',
  '/admin/talent/member',
  '/admin/talent/advice',
  // M3 报告域新页：基因报告菜单指向 /admin/talent/reports。
  '/admin/talent/reports',
  // M1 规则域新页面：方向 / 潜质要素 / 分级与固定注解（菜单已在 setup / sync-talent 登记）。
  '/admin/talent/rules',
]

function isFoundationPath(path: string): boolean {
  return [...FOUNDATION_PATHS, ...TALENT_PATHS].some(allowed => path === allowed || path.startsWith(`${allowed}/`))
}

function normalizeNodes(value: unknown): AdminMenuNode[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): AdminMenuNode[] => {
    if (!item || typeof item !== 'object') return []
    const source = item as Record<string, unknown>
    const children = normalizeNodes(source.children)
    const path = typeof source.path === 'string' ? source.path : ''
    if (path && !isFoundationPath(path)) return children.length ? children : []
    if (!path && !children.length) return []
    return [{
      key: String(source.key ?? source.id ?? path),
      label: String(source.label ?? source.menuName ?? '未命名菜单'),
      path: path || undefined,
      icon: typeof source.icon === 'string' ? source.icon : undefined,
      children,
    }]
  })
}

export function useMenuTree() {
  const route = useRoute()
  const router = useRouter()
  const iconMap = buildIconMap()
  const menuOptions = ref<AdminMenuNode[]>([])
  const loading = ref(true)
  const expandedKeys = ref<string[]>([])

  const nMenuOptions = computed<MenuOption[]>(() => {
    const toOption = (node: AdminMenuNode): MenuOption => {
      const icon = node.icon ? iconMap[node.icon] : undefined
      return {
        key: node.key,
        label: node.label,
        icon: icon ? () => h(NIcon, { component: icon as Component }) : undefined,
        children: node.children?.length ? node.children.map(toOption) : undefined,
      }
    }
    return menuOptions.value.map(toOption)
  })

  const activeKey = computed(() => findActiveKey(menuOptions.value, route.path))

  function findActiveKey(nodes: AdminMenuNode[], path: string): string {
    let result = ''
    let longestMatch = -1
    const walk = (items: AdminMenuNode[]) => {
      for (const item of items) {
        if (item.path && (path === item.path || path.startsWith(`${item.path}/`)) && item.path.length > longestMatch) {
          result = item.key
          longestMatch = item.path.length
        }
        if (item.children) walk(item.children)
      }
    }
    walk(nodes)
    return result
  }

  function findParentKeys(nodes: AdminMenuNode[], path: string, parents: string[] = []): string[] {
    for (const node of nodes) {
      const nextParents = node.children?.length ? [...parents, node.key] : parents
      if (node.path && (path === node.path || path.startsWith(`${node.path}/`))) return parents
      if (node.children?.length) {
        const matched = findParentKeys(node.children, path, nextParents)
        if (matched.length) return matched
      }
    }
    return []
  }

  async function load(): Promise<void> {
    loading.value = true
    try {
      const { getBootstrapCache, setBootstrapCache } = useBootstrapCache()
  // bootstrap 已按当前用户的角色筛选菜单与权限；侧边栏不能再调用菜单管理接口，
      // 否则只有业务页面权限的只读角色会因为缺少 system:menu:list 收到 403。
      const cached = getBootstrapCache()
      const bootstrap = cached ?? await useBootstrapApi().fetchBootstrap()
      if (!cached) setBootstrapCache(bootstrap)
      menuOptions.value = normalizeNodes(bootstrap.menuTree)
      expandedKeys.value = findParentKeys(menuOptions.value, route.path)
    } finally {
      loading.value = false
    }
  }

  function handleUpdate(key: string): void {
    const findPath = (nodes: AdminMenuNode[]): string | null => {
      for (const node of nodes) {
        if (node.key === key) return node.path ?? null
        const childPath = node.children ? findPath(node.children) : null
        if (childPath) return childPath
      }
      return null
    }
    const path = findPath(menuOptions.value)
    if (path) router.push(path)
  }

  onMounted(load)

  return { menuOptions, loading, activeKey, expandedKeys, nMenuOptions, handleUpdate, load }
}
