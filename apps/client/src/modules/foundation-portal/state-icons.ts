/**
 * @description 阻断态图标口径：C 端状态卡统一按语义取图标，页面不再各自写三元表达式。
 *   只映射状态名到 Wot 图标名，不涉及文案与业务判断。
 * @file src/modules/foundation-portal/state-icons.ts
 */

/** 状态卡使用的 Wot 图标。 */
const STATE_ICONS: Readonly<Record<string, string>> = {
  'empty': 'no-content',
  'no-report': 'file',
  'pending': 'clock-circle',
  'retracted': 'clock-circle',
  'unbound': 'user',
  'notfound': 'question-circle',
  'invalid': 'question-circle',
  'error': 'no-wifi',
  'session': 'lock',
}

/** 按状态名取图标，未登记的状态回退到信息图标。 */
export function blockingStateIcon(state: string): string {
  return STATE_ICONS[state] || 'info-circle'
}
