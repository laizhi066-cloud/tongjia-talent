/**
 * @description 字典数据获取组合式函数 — 缓存字典类型数据
 *              新增 preloadDicts 实现统一入口批量拉取 + getLabel/options/renderBadge 辅助
 * @file app/composables/useDict.ts
 */
import { h } from 'vue'
import DictBadge from '~/components/admin/DictBadge.vue'

// ============================================================
// 全局缓存（模块级，跨组件共享）
// ============================================================
let lastRefreshCount = 0
const cache = new Map<string, Record<string, any>[]>()

function checkClearCache() {
  try {
    const { getRefreshCounter } = useBootstrapCache()
    const current = getRefreshCounter()
    if (current !== lastRefreshCount) {
      cache.clear()
      lastRefreshCount = current
    }
  } catch {
    // 服务端可能无法获取 useState
  }
}

/**
 * 批量预加载字典数据 — 在 admin 布局 onMounted 统一调用
 * @param types 字典类型标识数组，如 ['sys_normal_disable', 'sys_yes_no']
 */
export async function preloadDicts(types: string[]) {
  if (types.length === 0) return
  checkClearCache()

  // 只拉取缓存未命中的
  const uncached = types.filter(t => !cache.has(t))
  if (uncached.length === 0) return

  try {
    const result = await useDictApi().fetchDictBatch(uncached)
    for (const [dictType, rows] of Object.entries(result)) {
      cache.set(dictType, rows)
    }
  } catch {
    // 预加载失败不影响页面，后续 useDict 会独立回退获取
  }
}

export function useDict(dictType: string) {
  checkClearCache()

  const data = ref<Record<string, any>[]>([])
  const loading = ref(false)
  const { hasPermission, fetchPermissions } = usePermission()

  async function fetchDict() {
    if (cache.has(dictType)) {
      data.value = cache.get(dictType)!
      return
    }
    await fetchPermissions()
    // 字典值仅对拥有字典读取权限的后台角色开放；无权限时保留原始字段值而不触发 403。
    if (!hasPermission('system:dict:list')) return
    loading.value = true
    try {
      const result = await useDictApi().fetchDictData({ dictType, pageSize: 100 })
      const rows = result.rows ?? []
      data.value = rows
      cache.set(dictType, rows)
    } catch {
      data.value = []
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchDict)

  // ============================================================
  // 辅助输出
  // ============================================================

  /** dictValue → dictDataItem 快速查找 */
  const dictMap = computed(() => {
    const map = new Map<string, Record<string, any>>()
    for (const item of data.value) {
      map.set(item.dictValue, item)
    }
    return map
  })

  /** 根据 dictValue 获取 dictLabel（纯文本） */
  function getLabel(value: string | number): string {
    return dictMap.value.get(String(value))?.dictLabel ?? String(value)
  }

  /** 选项列表，供 Select / RadioGroup 使用 */
  const options = computed(() =>
    data.value.map((item: Record<string, any>) => ({ label: item.dictLabel, value: item.dictValue })),
  )

  /** 渲染 DictBadge VNode，供表格 render 列使用 */
  function renderBadge(value: string | number) {
    const item = dictMap.value.get(String(value))
    if (!item) return h('span', String(value))
    return h(DictBadge, {
      dictLabel: item.dictLabel,
      dictType,
      dictValue: item.dictValue,
      listClass: item.listClass,
      icon: item.icon,
      backgroundColor: item.backgroundColor,
      color: item.color,
    })
  }

  return { data, loading, fetchDict, dictMap, getLabel, options, renderBadge }
}
