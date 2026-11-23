/**
 * @description 孩子管理页数据编排：加载已绑定孩子（脱敏 + 查询状态 + 报告篇数），
 *   区分加载 / 空 / 未绑定 / 错误四态；页面只消费状态，不直接拼请求。
 * @file src/pages/profile/composables/useProfileChildren.ts
 */
import { computed, ref } from 'vue'
import { getTalentChildren } from '@/api/talent'
import type { TalentChildItem } from '@/api/talent-types'
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '@/http/http'

/** 孩子管理页状态。 */
export type ChildrenPageState = 'loading' | 'ready' | 'empty' | 'unbound' | 'error'

/** 孩子管理数据编排。 */
export function useProfileChildren() {
  const items = ref<TalentChildItem[]>([])
  const state = ref<ChildrenPageState>('loading')
  const errorMessage = ref('')
  /** 首次加载完成前不闪空态。 */
  const resolved = ref(false)
  let requestSeq = 0

  /** 待核对（未查到）孩子数量，用于顶部说明卡。 */
  const pendingCheckCount = computed(() => items.value.filter(item => item.query === 'not_found').length)
  /** 已绑定当前账号的孩子数量。 */
  const boundCount = computed(() => items.value.length)

  /** 加载孩子列表；每次加载使用序号，丢弃迟到的旧响应。 */
  async function load(): Promise<void> {
    requestSeq += 1
    const seq = requestSeq
    if (!resolved.value)
      state.value = 'loading'
    errorMessage.value = ''
    try {
      const response = await getTalentChildren()
      if (seq !== requestSeq)
        return
      items.value = response.items || []
      state.value = items.value.length > 0 ? 'ready' : 'empty'
    }
    catch (error) {
      if (seq !== requestSeq)
        return
      items.value = []
      const status = apiErrorStatus(error)
      const code = apiErrorCode(error)
      if (status === 404 || code === 'UNBOUND' || code === 'NOT_FOUND') {
        state.value = 'unbound'
        errorMessage.value = '暂未关联会员档案'
      }
      else if (status === 401 || status === 403) {
        // 会话过期 / 账号停用由全局会话守卫接管跳转，页面不再叠加错误文案。
        state.value = 'error'
        errorMessage.value = ''
      }
      else {
        state.value = 'error'
        errorMessage.value = apiErrorMessage(error, '孩子档案暂时无法读取，请稍后重试')
      }
    }
    finally {
      if (seq === requestSeq)
        resolved.value = true
    }
  }

  /** 重试 / 从表单返回后的刷新。 */
  function reload(): Promise<void> {
    resolved.value = false
    return load()
  }

  return {
    items,
    state,
    errorMessage,
    resolved,
    pendingCheckCount,
    boundCount,
    load,
    reload,
  }
}
