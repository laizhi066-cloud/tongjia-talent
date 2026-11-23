/* 业务示例数据：规则、配置、快照与结果四层对象。
   规则层（要素/分级/注解）、配置层（培养方向/目标档位）、快照层（报告）、结果层（已选方向与档位）。
   本文件只用于页面数据展示，不连接生产接口。 */

import { ELEMENT_ITEMS, ELEMENT_BOOKS } from './element-lib.js?v=1.61.0'

/* 分类与分册统一取「天赋规则 → 潜质要素」文库的 6 个分册：
   后台要素表、培养方向配置、报告分册与家长端目录共用同一套编码，不再维护第二套要素体系。 */
export const CATEGORIES = ELEMENT_BOOKS.map(b => ({ code: b.code, name: b.name }))

/* 报告固定六册：与潜质要素文库的 6 个分册一一对应，发布时逐册选择开放范围 */
const VOLUME_INTRO = {
  A: '观察体格、运动发育与感觉器功能相关的潜质表现。',
  B: '观察注意、记忆与学习能力相关的潜质表现。',
  C: '观察情绪表达、调节与社交交往相关的潜质表现。',
  D: '观察认知、目标决策、组织整合与环境适应相关的潜质表现。',
  E: '观察艺术认知、创作与表演技能相关的潜质表现。',
  F: '观察力量、速度、耐力与运动技能相关的潜质表现。'
}
const BOOK_ORDINAL = ['一', '二', '三', '四', '五', '六']
export const VOLUMES = ELEMENT_BOOKS.map((b, i) => ({
  id: `V${i + 1}`,
  code: b.code,
  name: `第${BOOK_ORDINAL[i] || i + 1}分册 · ${b.name}`,
  shortName: b.name,
  intro: VOLUME_INTRO[b.code] || ''
}))
export const ALL_VOLUME_IDS = VOLUMES.map(v => v.id)
const CHAPTER_ORDINAL = ['一', '二', '三', '四']

/* 分册快照：发布时按冻结后的要素结果划分章节，未开放分册不进入家长端 */
export function buildVolumeSnapshot(factors = [], openIds = ALL_VOLUME_IDS) {
  const open = new Set(openIds && openIds.length ? openIds : ALL_VOLUME_IDS)
  return VOLUMES.map((v, i) => {
    const list = factors.filter(f => f.category === v.code)
    const chapters = LEVELS.slice().sort((a, b) => b.order - a.order)
      .map((l, ci) => ({
        id: `${v.id}-CH${ci + 1}`,
        name: `第${CHAPTER_ORDINAL[ci] || ci + 1}章 · ${l.name}表现`,
        level: l.name,
        count: list.filter(f => f.level === l.name).length,
        factorCodes: list.filter(f => f.level === l.name).map(f => f.code)
      })).filter(c => c.count > 0)
    return {
      ...v, seq: i + 1, open: open.has(v.id), factorCount: list.length,
      chapterCount: chapters.length, chapters, factorCodes: list.map(f => f.code)
    }
  })
}

/* 四档分级：级序用于判断方向命中，结果范围用于把指标映射为分级 */
export const LEVELS = [
  { code: 'LV1', name: '常态', order: 1, range: '0–59', tone: 'slate' },
  { code: 'LV2', name: '优良', order: 2, range: '60–74', tone: 'blue' },
  { code: 'LV3', name: '优秀', order: 3, range: '75–89', tone: 'teal' },
  { code: 'LV4', name: '卓越', order: 4, range: '90–100', tone: 'amber' }
]

const NOTE_TEMPLATES = {
  卓越: n => `${n}表现处于同龄人前列，建议提供更具挑战的任务与展示机会，避免重复练习削弱兴趣。`,
  优秀: n => `${n}发展良好，可在现有基础上增加复杂度，配合阶段性目标巩固优势。`,
  优良: n => `${n}具备基本能力，建议通过规律练习与情境化任务稳步提升。`,
  常态: n => `${n}当前表现平稳，建议以兴趣引导为主，不急于设定量化目标。`
}

export const levelOf = score =>
  score >= 90 ? '卓越' : score >= 75 ? '优秀' : score >= 60 ? '优良' : '常态'
export const levelOrder = name => (LEVELS.find(l => l.name === name) || LEVELS[0]).order

/* 158 项潜质要素：唯一事实来源为「潜质要素」文库，编码沿用分册内序号（A-01 这类）。
   演示结果按「分册 + 序号」做确定性散列，同一要素每次刷新结果与分级不变，便于核对快照。 */
export const FACTORS = ELEMENT_ITEMS.map(el => {
  const score = 42 + ((el.no * 23 + el.book.charCodeAt(0) * 7 + (el.no * el.no) % 17) % 57)
  const level = levelOf(score)
  return {
    code: el.code,
    name: el.name,
    category: el.book,
    categoryName: el.bookName,
    score,
    level,
    note: NOTE_TEMPLATES[level](el.name),
    ageRange: '0 岁',
    gender: '男',
    status: '启用'
  }
})

export const factorByCode = code => FACTORS.find(f => f.code === code)

/* 全局四档目标档位；各方向启用其中若干档并可覆盖文案 */
export const TIERS = [
  { id: 'T1', name: '启蒙', teacher: '普通老师', freq: '每周 1–2 次', headline: '先让孩子喜欢上', desc: '以兴趣体验和基础感知为主，通过游戏化练习建立稳定接触，不设定考核目标。适合零基础、先试一试的家庭。' },
  { id: 'T2', name: '养成', teacher: '资深老师', freq: '每周 2 次', headline: '把喜欢变成习惯', desc: '按固定频次系统练习，建立基本功与练习节奏，阶段性展示学习成果。适合已接触过、希望坚持下来的孩子。' },
  { id: 'T3', name: '精进', teacher: '卓越老师', freq: '每周 2–3 次', headline: '从会一点到拿得出手', desc: '以薄弱环节突破为主，系统训练，参加展演、比赛或等级考核。适合已有基础、希望在同龄人中突出的孩子。' },
  { id: 'T4', name: '冲刺', teacher: '大师级老师', freq: '每周 3 次以上', headline: '走专业路线', desc: '一对一定制训练方案，对准比赛名次、专业考级或专业院校方向。适合目标明确、家庭可长期投入的孩子。' }
]

const req = (code, level) => ({ code, level })

/* 培养方向：方向—要素—要求分级。报告中的要素实际分级达到要求分级即记 1 条命中。
   要素一律引用「潜质要素」文库编码（A-01 ~ F-23），与配置弹层的可选列表同源。 */
export const DIRECTIONS = [
  {
    id: 'D01', code: 'DIR-001', name: '舞蹈家', icon: '舞', status: '启用', version: 'v1.2',
    desc: '以肢体协调、节奏感与表现力为核心，适合在律动与身体表达上表现突出的孩子。',
    tiers: ['T1', 'T2', 'T3', 'T4'], selectedCount: 6,
    requirements: [req('E-16', '优秀'), req('E-15', '优良'), req('F-11', '优秀'), req('F-10', '优良'), req('E-03', '优良'), req('F-03', '优良')]
  },
  {
    id: 'D02', code: 'DIR-002', name: '音乐家', icon: '音', status: '启用', version: 'v1.1',
    desc: '以音高辨别、旋律记忆与节拍稳定为核心，适合听觉敏感、对声音有持续兴趣的孩子。',
    tiers: ['T1', 'T2', 'T3', 'T4'], selectedCount: 5,
    requirements: [req('E-09', '卓越'), req('E-10', '优秀'), req('E-12', '优秀'), req('E-11', '优良'), req('E-01', '优良')]
  },
  {
    id: 'D03', code: 'DIR-003', name: '逻辑思维', icon: '思', status: '启用', version: 'v1.0',
    desc: '以推理、问题拆解与模式识别为核心，适合喜欢追问原因、擅长找规律的孩子。',
    tiers: ['T1', 'T2', 'T3'], selectedCount: 5,
    requirements: [req('B-34', '优秀'), req('B-39', '优秀'), req('B-38', '优良'), req('B-18', '优良'), req('B-28', '优良')]
  },
  {
    id: 'D04', code: 'DIR-004', name: '语言表达', icon: '言', status: '启用', version: 'v1.0',
    desc: '以叙事组织、口头表达与倾听理解为核心，适合爱说、爱讲、能带动现场气氛的孩子。',
    tiers: ['T1', 'T2', 'T3'], selectedCount: 5,
    requirements: [req('B-36', '优秀'), req('B-35', '优秀'), req('B-37', '优良'), req('B-20', '优良'), req('C-24', '优良')]
  },
  {
    id: 'D05', code: 'DIR-005', name: '绘画创作', icon: '画', status: '启用', version: 'v1.0',
    desc: '以空间想象、色彩敏感与细节观察为核心，适合喜欢涂画、对图像细节敏感的孩子。',
    tiers: ['T1', 'T2', 'T3', 'T4'], selectedCount: 5,
    requirements: [req('E-14', '优秀'), req('E-13', '优秀'), req('E-03', '优良'), req('E-04', '优良'), req('E-06', '优良')]
  },
  {
    id: 'D06', code: 'DIR-006', name: '运动竞技', icon: '动', status: '启用', version: 'v1.0',
    desc: '以反应速度、爆发力量与姿态稳定为核心，适合在对抗性运动中表现积极的孩子。',
    tiers: ['T2', 'T3', 'T4'], selectedCount: 5,
    requirements: [req('F-05', '优秀'), req('F-04', '优秀'), req('F-10', '优良'), req('F-15', '优良'), req('F-07', '优良')]
  }
]

export const directionById = id => DIRECTIONS.find(d => d.id === id)

/* 方向命中口径：报告实际分级 ≥ 要求分级即记 1 条命中。
   发布快照在 store.js 按同一口径计算并冻结，不做加权匹配。 */

/* 家长、子女、查询状态：手机号 + 身份证号用于主动查询 */
/* 家长身份证号为选填：已填写的按脱敏值保存，未填写的留空 */
export const INITIAL_PARENTS = [
  { id: 'P202611001', name: '陈女士', mobile: '138****6621', idNo: '4403**********1021',
    gender: '女', birthday: '1990-01-12', avatar: '陈', source: '小程序注册', status: '正常', registeredAt: '2026-11-02 09:14' },
  { id: 'P202611002', name: '林先生', mobile: '139****4088', idNo: '',
    gender: '男', birthday: '1988-06-03', avatar: '林', source: '小程序注册', status: '正常', registeredAt: '2026-11-03 16:32' },
  { id: 'P202611003', name: '周女士', mobile: '137****2150', idNo: '4403**********3056',
    gender: '女', birthday: '1991-09-18', avatar: '周', source: '后台录入', status: '正常', registeredAt: '2026-11-04 10:05' }
]

export const INITIAL_CHILDREN = [
  { id: 'C202611001', parentId: 'P202611001', name: '陈一诺', gender: '女', relation: '母亲', birthday: '2016-05-12', idNo: '4403**********0021', query: '已查到', source: '小程序注册' },
  { id: 'C202611002', parentId: 'P202611001', name: '陈一凡', gender: '男', relation: '母亲', birthday: '2019-08-03', idNo: '4403**********0038', query: '未查到', reason: '信息不一致', source: '小程序注册' },
  { id: 'C202611005', parentId: 'P202611001', name: '陈一宁', gender: '女', relation: '母亲', birthday: '2021-04-27', idNo: '4403**********0062', query: '未查到', reason: '接口异常', source: '小程序注册' },
  { id: 'C202611006', parentId: 'P202611001', name: '陈一安', gender: '男', relation: '母亲', birthday: '2022-10-09', idNo: '4403**********0075', query: '查询中', source: '小程序注册' },
  { id: 'C202611007', parentId: 'P202611001', name: '陈一然', gender: '男', relation: '母亲', birthday: '2018-03-08', idNo: '4403**********0088', query: '已查到', source: '小程序注册' },
  { id: 'C202611008', parentId: 'P202611001', name: '陈一可', gender: '女', relation: '母亲', birthday: '2020-09-21', idNo: '4403**********0095', query: '已查到', source: '小程序注册' },
  { id: 'C202611009', parentId: 'P202611001', name: '陈一航', gender: '男', relation: '母亲', birthday: '2014-12-02', idNo: '4403**********0108', query: '已查到', source: '小程序注册' },
  { id: 'C202611010', parentId: 'P202611001', name: '陈一舟', gender: '女', relation: '母亲', birthday: '2016-07-30', idNo: '4403**********0115', query: '已查到', source: '小程序注册' },
  { id: 'C202611012', parentId: 'P202611001', name: '陈一澜', gender: '男', relation: '母亲', birthday: '2019-05-06', idNo: '4403**********0139', query: '已查到', source: '小程序注册' },
  { id: 'C202611013', parentId: 'P202611001', name: '陈一澄', gender: '女', relation: '母亲', birthday: '2020-12-05', idNo: '4403**********0146', query: '已查到', source: '小程序注册' },
  { id: 'C202611011', parentId: 'P202611001', name: '陈一星', gender: '男', relation: '母亲', birthday: '2023-02-14', idNo: '4403**********0122', query: '未查询', source: '小程序注册' },
  { id: 'C202611003', parentId: 'P202611002', name: '林小满', gender: '女', relation: '父亲', birthday: '2017-02-19', idNo: '4403**********0044', query: '已查到', source: '小程序注册' },
  { id: 'C202611004', parentId: 'P202611003', name: '周予安', gender: '男', relation: '母亲', birthday: '2018-11-07', idNo: '4403**********0056', query: '已查到', source: '后台录入' }
]

/* 家长与孩子的亲属关系：C 端建档、后台录入与会员详情共用同一份选项 */
export const CHILD_RELATIONS = ['父亲', '母亲', '祖父', '祖母', '外祖父', '外祖母', '其他监护人']
export const defaultRelation = parent => parent?.gender === '男' ? '父亲' : '母亲'

export const QUERY_STATES = ['未查询', '查询中', '已查到', '未查到']
export const QUERY_REASONS = ['未出结果', '信息不一致', '接口异常']

/* 报告状态只有三种：待发布（已生成、未发布）/ 已发布 / 已撤回（发布后可撤回，可再恢复） */
export const REPORT_STATES = ['待发布', '已发布', '已撤回']

/* 报告快照：发布即冻结，方向要求分级后续调整不影响历史报告 */
export const INITIAL_REPORTS = [
  {
    id: 'R20261104-001', childId: 'C202611001', childName: '陈一诺', parentId: 'P202611001',
    subjectType: 'child', subjectId: 'C202611001',
    status: '已发布', queriedAt: '2026-11-04 08:12', publishedAt: '2026-11-04 10:26',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 0,
    openVolumeIds: ALL_VOLUME_IDS,
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: true
  },
  {
    id: 'R20261104-002', childId: 'C202611003', childName: '林小满', parentId: 'P202611002',
    subjectType: 'child', subjectId: 'C202611003',
    status: '待发布', queriedAt: '2026-11-04 11:40', publishedAt: '',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 0,
    openVolumeIds: ['V1', 'V2', 'V3', 'V4'],
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: true
  },
  {
    /* 已撤回态的演示挂到周予安：他已有基因报告（BDF），查询状态同步置为「已查到」，
       这样一个对象只对应一份报告，报告层三态（已发布 / 待发布 / 已撤回）仍各自有人演示。 */
    id: 'R20261105-001', childId: 'C202611004', childName: '周予安', parentId: 'P202611003',
    subjectType: 'child', subjectId: 'C202611004',
    status: '已撤回', queriedAt: '2026-11-03 09:20', publishedAt: '',
    factorCount: 158, snapshotVersion: 'v1.1', readProgress: 0,
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: false
  },
  {
    /* 报告三态之外的两种边界：待发布、已撤回（家长端只看到「整理中 / 更新中」） */
    id: 'R20261107-001', childId: 'C202611007', childName: '陈一然', parentId: 'P202611001',
    subjectType: 'child', subjectId: 'C202611007',
    status: '待发布', queriedAt: '2026-11-13 09:12', publishedAt: '',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 0,
    openVolumeIds: ['V1', 'V2', 'V3', 'V4'],
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: true
  },
  {
    id: 'R20261107-002', childId: 'C202611008', childName: '陈一可', parentId: 'P202611001',
    subjectType: 'child', subjectId: 'C202611008',
    status: '已撤回', queriedAt: '2026-11-10 10:22', publishedAt: '',
    factorCount: 158, snapshotVersion: 'v1.1', readProgress: 0,
    openVolumeIds: ['V1', 'V2', 'V3'],
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: false
  },
  {
    /* 0 命中：发布快照里所有方向命中数为 0，家长端仍可从未匹配的方向里选（zeroHits 见 store.js） */
    id: 'R20261107-003', childId: 'C202611009', childName: '陈一航', parentId: 'P202611001',
    subjectType: 'child', subjectId: 'C202611009', zeroHits: true,
    status: '已发布', queriedAt: '2026-11-12 11:05', publishedAt: '2026-11-12 15:20',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 0,
    openVolumeIds: ALL_VOLUME_IDS,
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: true
  },
  {
    /* 部分册：只开放前两册，且这一位没有培育建议（验证建议 0 时的空态） */
    id: 'R20261107-004', childId: 'C202611010', childName: '陈一舟', parentId: 'P202611001',
    subjectType: 'child', subjectId: 'C202611010',
    status: '已发布', queriedAt: '2026-11-12 16:40', publishedAt: '2026-11-12 18:05',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 0,
    openVolumeIds: ['V1', 'V2'],
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: true
  },
  {
    /* 增量分册：外部已出 5 册，平台先发布前 2 册；CDE 在后台标「新增分册」，可一键补发 */
    id: 'R20261108-001', childId: 'C202611012', childName: '陈一澜', parentId: 'P202611001',
    subjectType: 'child', subjectId: 'C202611012',
    status: '已发布', queriedAt: '2026-11-11 09:02', publishedAt: '2026-11-11 10:15',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 0,
    openVolumeIds: ['V1', 'V2'],
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: true
  },
  {
    /* 空推荐：发布快照里没有任何方向命中（noDirections），家长端推荐页为空，
       只能从后台已配置方向里自己挑，或自己填写 */
    id: 'R20261109-001', childId: 'C202611013', childName: '陈一澄', parentId: 'P202611001',
    subjectType: 'child', subjectId: 'C202611013', noDirections: true,
    status: '已发布', queriedAt: '2026-11-12 09:30', publishedAt: '2026-11-12 11:00',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 0,
    openVolumeIds: ['V1', 'V2', 'V3'],
    selections: [], manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: false
  },
  {
    id: 'R20261105-002', childId: 'SELF', childName: '陈女士（本人）', parentId: 'P202611001',
    subjectType: 'self', subjectId: 'self',
    status: '已发布', queriedAt: '2026-11-05 08:30', publishedAt: '2026-11-05 14:12',
    factorCount: 158, snapshotVersion: 'v1.2', readProgress: 36,
    // 已读编码与阅读进度一致：前 36 项落在已开放的前两册内
    readCodes: FACTORS.slice(0, 36).map(f => f.code),
    openVolumeIds: ['V1', 'V2', 'V3', 'V4'],
    selections: [{ directionId: 'D01', tierId: 'T2', manualName: '', at: '2026-11-05 15:20' }],
    manualDirection: '',
    source: '第三方接口主动查询', matchEnabled: true
  }
]

/* 后台账号与角色 */
export const BACK_USERS = [
  { id: 'U01', name: '王运营', account: 'wang.ops', role: '运营管理员', status: '正常', lastLogin: '2026-11-04 09:02' },
  { id: 'U02', name: '李审核', account: 'li.audit', role: '报告审核员', status: '正常', lastLogin: '2026-11-04 10:21' },
  { id: 'U03', name: '张配置', account: 'zhang.cfg', role: '规则配置员', status: '停用', lastLogin: '2026-11-01 15:47' }
]
export const ROLES = [
  { name: '运营管理员', scope: '全部菜单', members: 1 },
  { name: '报告审核员', scope: '工作台、报告管理、会员管理（只读）', members: 1 },
  { name: '规则配置员', scope: '天赋规则、培养方向', members: 1 }
]

/* 导入模板、操作日志。
   待处理事项不再预置固定清单：工作台按报告三态、子女查询状态与自定义方向实时派生（见 store.js 的 workbenchTodos）。 */
export const IMPORT_TEMPLATES = [
  { name: '天赋要素模板', fields: '要素编码、要素名称、分类前缀、状态', rows: 158, last: '2026-11-01 14:20' },
  { name: '分级与结果范围模板', fields: '分级名称、级序、得分下限、得分上限', rows: 4, last: '2026-11-01 14:22' },
  { name: '固定注解模板', fields: '要素编码、分级、注解正文、年龄条件（具体年龄）、性别条件（男 / 女）', rows: 632, last: '2026-11-01 14:25' }
]

export const OP_LOGS = [
  { time: '2026-11-04 11:40', user: '系统', action: '主动查询', detail: '林小满 · 查询成功，返回 158 项要素结果' },
  { time: '2026-11-04 10:26', user: '李审核', action: '报告发布', detail: 'R20261104-001 整份发布，生成方向与注解快照' },
  { time: '2026-11-04 10:05', user: '王运营', action: '后台录入', detail: '新建会员周女士及子女周予安' },
  { time: '2026-11-04 09:31', user: '张配置', action: '方向配置', detail: '舞蹈家 v1.2 要素与要求分级复核通过' }
]

/* 固定注解：按「要素 × 分级」一条，全量 158 × 4 = 632 条，可在后台维护。
   年龄条件只收具体年龄（岁）、性别条件只有男 / 女；texts 为多条话术，
   小程序端每次随机展示其中一条（note 恒为第一条，兼容旧读取方）。 */
export const INITIAL_NOTES = FACTORS.flatMap(f => LEVELS.map(l => ({
  id: `${f.code}-${l.code}`,
  factorCode: f.code,
  factorName: f.name,
  category: f.category,
  level: l.name,
  note: NOTE_TEMPLATES[l.name](f.name),
  texts: [NOTE_TEMPLATES[l.name](f.name)],
  ageRange: '0 岁',
  gender: '男',
  status: '启用'
})))

/* 演示：给「B-01 本体感知注意能力潜质 · 常态」预置 3 条话术，
   便于在小程序端直观看到「每次进入随机展示一条」的效果。 */
const DEMO_NOTE_CODE = 'B-01'
const demoNote = INITIAL_NOTES.find(n => n.factorCode === DEMO_NOTE_CODE && n.level === '常态')
if (demoNote) {
  demoNote.texts = [
    '本体感知注意表现平稳，建议在日常活动中用短时、明确的指令帮孩子聚焦当前动作。',
    '本体感知注意处于同龄常规水平，建议通过模仿游戏与动作复述练习，逐步延长专注时长。',
    '本体感知注意有基础但波动较大，建议先固定作息与活动顺序，减少环境干扰后再加长任务。'
  ]
  demoNote.note = demoNote.texts[0]
}

/* 后台级联菜单：一级分组 + 二级功能页，分组可折叠、启停与排序 */
export const MENU_GROUPS = [
  { id: 'G1', name: '工作台', icon: '▦', sort: 1, status: '启用' },
  { id: 'G2', name: '会员管理', icon: '◉', sort: 2, status: '启用' },
  { id: 'G3', name: '培养方向', icon: '◇', sort: 3, status: '启用' },
  { id: 'G4', name: '天赋规则', icon: '▤', sort: 4, status: '启用' },
  { id: 'G5', name: '报告管理', icon: '▧', sort: 5, status: '启用' },
  { id: 'G6', name: '系统管理', icon: '⚙', sort: 6, status: '启用' }
]

/* 后台菜单初始配置：按 2026-11-06 客户口径拆分系统管理，导入并入规则页 */
export const ADMIN_MENU = [
  { id: 'workbench', group: '工作台', name: '工作台与待办', path: '/admin/workbench', icon: '▦', sort: 1, status: '启用', roles: '全部角色' },
  { id: 'members', group: '会员管理', name: '会员管理', path: '/admin/members', icon: '◉', sort: 2, status: '启用', roles: '运营管理员、报告审核员' },
  { id: 'directions', group: '培养方向', name: '培养方向管理', path: '/admin/directions', icon: '◇', sort: 3, status: '启用', roles: '运营管理员、规则配置员' },
  { id: 'factors', group: '天赋规则', name: '潜质要素', path: '/admin/factors', icon: '▤', sort: 4, status: '启用', roles: '规则配置员' },
  { id: 'levels', group: '天赋规则', name: '分级与固定注解', path: '/admin/levels', icon: '▥', sort: 5, status: '启用', roles: '规则配置员' },
  { id: 'reports', group: '报告管理', name: '基因报告', path: '/admin/reports', icon: '▧', sort: 6, status: '启用', roles: '运营管理员、报告审核员' },
  { id: 'suggestions', group: '报告管理', name: '培育建议', path: '/admin/suggestions', icon: '✎', sort: 7, status: '启用', roles: '运营管理员、报告审核员' },
  { id: 'users', group: '系统管理', name: '用户列表', path: '/admin/users', icon: '☰', sort: 8, status: '启用', roles: '运营管理员' },
  { id: 'menus', group: '系统管理', name: '菜单管理', path: '/admin/menus', icon: '▣', sort: 9, status: '启用', roles: '运营管理员' },
  { id: 'roles', group: '系统管理', name: '角色管理', path: '/admin/roles', icon: '◈', sort: 10, status: '启用', roles: '运营管理员' },
  { id: 'opLogs', group: '系统管理', name: '操作日志', path: '/admin/opLogs', icon: '◷', sort: 11, status: '启用', roles: '运营管理员' }
]

export const ROLE_OPTIONS = ['全部角色', '运营管理员', '报告审核员', '规则配置员', '运营管理员、报告审核员', '运营管理员、规则配置员']

/* ================= 外部系统同步：基因检测报告（固定格式） =================
   客户《个性化能力培育开发基因服务报告》A~F 共 6 篇，同一「本人报告ID」下按人同步其中的若干篇，
   不是每个人都会有全部 6 篇。以下篇名、章节与专项潜质清单取自客户真实报告，
   本系统只做同步、更新与展示，不修改任何正文内容。 */
export const GENE_BOOKS = [
  { code: 'A', name: '生长发育潜质数据报告', series: '天生我才·必有用系列', chapterCount: 5, chapters: ['体格生长 • 发育潜质', '运动器生长 • 发育潜质', '脑中枢生长 • 发育潜质', '神经网络生长 • 发育潜质', '感觉器生长 • 发育潜质'], factorCount: 26 },
  { code: 'B', name: '智商潜质数据报告', series: '天生我才·必有用系列', chapterCount: 3, chapters: ['注意能力潜质', '记忆能力潜质', '学习能力潜质'], factorCount: 39 },
  { code: 'C', name: '情商潜质数据报告', series: '天生我才·必有用系列', chapterCount: 4, chapters: ['情绪管理能力潜质', '情感管理能力潜质', '抗压能力潜质', '社交能力潜质'], factorCount: 27 },
  { code: 'D', name: '领导商潜质数据报告', series: '三份天注定·七分靠打拼系列', chapterCount: 8, chapters: ['认知能力潜质', '战略规划能力潜质', '决策能力潜质', '人际影响力能力潜质', '资源整合能力潜质', '执行能力潜质', '领导力表型潜质', '附件 · 领导力表型潜质'], factorCount: 25 },
  { code: 'E', name: '艺术商潜质数据报告', series: '三份天注定·七分靠打拼系列', chapterCount: 4, chapters: ['审美感受能力潜质', '艺术设计能力潜质', '艺术创作能力潜质', '艺术表达技能潜质'], factorCount: 18 },
  { code: 'F', name: '体育运动商潜质数据报告', series: '三份天注定·七分靠打拼系列', chapterCount: 4, chapters: ['体育运动躯体能力（体力）潜质', '体育运动脑工作能力（脑力）潜质', '体育运动心理调控能力（心力）潜质', '体育运动技能应用能力潜质'], factorCount: 21 },
]
export const GENE_FORMAT = {
  cover: ['本人姓名', '性别', '出生日期', '本人报告ID', '建档日期', '家长姓名', '与本人关系', '联系电话', '报告出品'],
  dataSource: '23 对染色体 · 582 个等位基因区间 · 1842 个 SNP 位点 · 291 个基因型 · 7 级连锁挖掘运算',
  catalog: ['序号', '天赋潜质名称', '数据熵', '位置'],
  entropy: ['卓越级', '优秀级', '常态级', '弱态级'],
  sections: ['封面', '内容简介', '数据源', '数据熵', '重要内容提示', '正文（分章 · 专项潜质清单）', '潜质表型要点', '接续服务', '声明'],
  note: '由外部基因检测系统按固定格式同步，本系统不修改正文，仅同步、更新与展示。'
}
export const GENE_FACTORS = {
  A: [
    { no: 1, name: '体格生长潜质', level: '优秀', page: '12' },
    { no: 2, name: '体形发育潜质', level: '优秀', page: '13' },
    { no: 3, name: '力量运动生长潜质', level: '优秀', page: '15' },
    { no: 4, name: '力量运动发育潜质', level: '优秀', page: '16' },
    { no: 5, name: '灵活运动生长潜质', level: '常态', page: '17' },
    { no: 6, name: '灵活运动发育潜质', level: '卓越', page: '18' },
    { no: 7, name: '精细运动生长潜质', level: '优秀', page: '19' },
    { no: 8, name: '精细运动发育潜质', level: '卓越', page: '20' },
    { no: 9, name: '脑中枢生长潜质', level: '常态', page: '22' },
    { no: 10, name: '脑中枢发育潜质', level: '常态', page: '23' },
    { no: 11, name: '中枢神经网络生长潜质', level: '常态', page: '25' },
    { no: 12, name: '中枢神经网络发育潜质', level: '常态', page: '26' },
    { no: 13, name: '周围神经网络生长潜质', level: '常态', page: '27' },
    { no: 14, name: '周围神经网络发育潜质', level: '常态', page: '28' },
    { no: 15, name: '视感觉器生长潜质', level: '常态', page: '31' },
    { no: 16, name: '视感觉器发育潜质', level: '常态', page: '32' },
    { no: 17, name: '视感觉器生理功能潜质', level: '常态', page: '33' },
    { no: 18, name: '听感觉器生长潜质', level: '常态', page: '34' },
    { no: 19, name: '听感觉器发育潜质', level: '常态', page: '35' },
    { no: 20, name: '听感觉器生理功能潜质', level: '常态', page: '36' },
    { no: 21, name: '嗅感觉器生长潜质', level: '常态', page: '37' },
    { no: 22, name: '嗅感觉器发育潜质', level: '常态', page: '38' },
    { no: 23, name: '嗅感觉器生理功能潜质', level: '常态', page: '39' },
    { no: 24, name: '触感觉器生长潜质', level: '常态', page: '40' },
    { no: 25, name: '触感觉器发育潜质', level: '常态', page: '41' },
    { no: 26, name: '触感觉器生理功能潜质', level: '常态', page: '42' }
  ],
  B: [
    { no: 1, name: '本体感知注意能力潜质', level: '常态', page: '14' },
    { no: 2, name: '视主观注意能力潜质', level: '优秀', page: '15' },
    { no: 3, name: '听主观注意能力潜质', level: '优秀', page: '16' },
    { no: 4, name: '触主观注意能力潜质', level: '优秀', page: '17' },
    { no: 5, name: '嗅主观注意能力潜质', level: '卓越', page: '18' },
    { no: 6, name: '本能记忆能力潜质', level: '常态', page: '23' },
    { no: 7, name: '视情景本能记忆能力潜质', level: '常态', page: '24' },
    { no: 8, name: '听情景本能记忆能力潜质', level: '常态', page: '25' },
    { no: 9, name: '触情景本能记忆能力潜质', level: '常态', page: '26' },
    { no: 10, name: '嗅情景本能记忆能力潜质', level: '常态', page: '27' },
    { no: 11, name: '复习转化长时记忆能力潜质', level: '优秀', page: '28' },
    { no: 12, name: '短—中时记忆脑区转换能力潜质', level: '常态', page: '29' },
    { no: 13, name: '中—长时记忆脑区转换能力潜质', level: '优秀', page: '30' },
    { no: 14, name: '长时程记忆能力潜质', level: '优秀', page: '31' },
    { no: 15, name: '中时程记忆能力潜质', level: '常态', page: '32' },
    { no: 16, name: '短时程记忆能力潜质', level: '常态', page: '33' },
    { no: 17, name: '记忆信息更新能力潜质', level: '常态', page: '34' },
    { no: 18, name: '抽象信息记忆能力潜质', level: '常态', page: '35' },
    { no: 19, name: '视情景记忆能力潜质', level: '优秀', page: '36' },
    { no: 20, name: '声情景记忆能力潜质', level: '优秀', page: '37' },
    { no: 21, name: '触情景记忆能力潜质', level: '优秀', page: '38' },
    { no: 22, name: '嗅情景记忆能力潜质', level: '优秀', page: '39' },
    { no: 23, name: '语义·数字抽象情景记忆能力潜质', level: '常态', page: '40' },
    { no: 24, name: '本能模仿学习能力潜质', level: '常态', page: '45' },
    { no: 25, name: '主观主动学习能力潜质', level: '常态', page: '46' },
    { no: 26, name: '复习纠错学习能力潜质', level: '优秀', page: '47' },
    { no: 27, name: '感性体验学习能力潜质', level: '常态', page: '48' },
    { no: 28, name: '专注（纵深）学习能力潜质', level: '常态', page: '49' },
    { no: 29, name: '发散（横向）学习能力潜质', level: '优秀', page: '50' },
    { no: 30, name: '视情景学习能力潜质', level: '常态', page: '51' },
    { no: 31, name: '声情景学习能力潜质', level: '常态', page: '52' },
    { no: 32, name: '嗅情景学习能力潜质', level: '常态', page: '53' },
    { no: 33, name: '触情景学习能力潜质', level: '常态', page: '54' },
    { no: 34, name: '抽象逻辑学习能力潜质', level: '常态', page: '55' },
    { no: 35, name: '语言学习能力潜质', level: '常态', page: '56' },
    { no: 36, name: '语言口语应用能力潜质', level: '常态', page: '57' },
    { no: 37, name: '语言文案应用能力潜质', level: '常态', page: '58' },
    { no: 38, name: '数字·符号学习能力潜质', level: '常态', page: '59' },
    { no: 39, name: '数字·符号应用能力潜质', level: '常态', page: '60' }
  ],
  C: [
    { no: 1, name: '感性（快速）情绪表达能力潜质', level: '优秀', page: '14' },
    { no: 2, name: '理性（缓速）情绪表达能力潜质', level: '优秀', page: '15' },
    { no: 3, name: '感性—理性情绪调整能力潜质', level: '优秀', page: '16' },
    { no: 4, name: '理性—感性情绪调整能力潜质', level: '常态', page: '17' },
    { no: 5, name: '感性情感表达能力潜质', level: '常态', page: '21' },
    { no: 6, name: '理性情感表达能力潜质', level: '常态', page: '22' },
    { no: 7, name: '专注性情感管理能力潜质', level: '优秀', page: '23' },
    { no: 8, name: '发散性情感管理能力潜质', level: '常态', page: '24' },
    { no: 9, name: '感性—理性情感调节能力潜质', level: '优秀', page: '25' },
    { no: 10, name: '理性—感性情感调节能力潜质', level: '常态', page: '26' },
    { no: 11, name: '专注—发散情感调节能力潜质', level: '常态', page: '27' },
    { no: 12, name: '发散—专注情感调节能力潜质', level: '优秀', page: '28' },
    { no: 13, name: '负面条件容忍能力潜质', level: '优秀', page: '32' },
    { no: 14, name: '负面条件适应能力潜质', level: '优秀', page: '33' },
    { no: 15, name: '主动应对负面条件能力潜质', level: '优秀', page: '34' },
    { no: 16, name: '负面条件应对耐力潜质', level: '优秀', page: '35' },
    { no: 17, name: '情绪交往能力潜质', level: '常态', page: '39' },
    { no: 18, name: '情感交往能力潜质', level: '常态', page: '40' },
    { no: 19, name: '理性选择交往能力潜质', level: '常态', page: '41' },
    { no: 20, name: '陌生个体交际能力潜质', level: '常态', page: '42' },
    { no: 21, name: '陌生群体交际能力潜质', level: '优秀', page: '43' },
    { no: 22, name: '发散性交往能力潜质', level: '常态', page: '44' },
    { no: 23, name: '人际关系专注性维护能力潜质', level: '优秀', page: '45' },
    { no: 24, name: '社交场景适应能力潜质', level: '优秀', page: '46' },
    { no: 25, name: '社交群体适应能力潜质', level: '优秀', page: '47' },
    { no: 26, name: '感性应变能力潜质', level: '优秀', page: '48' },
    { no: 27, name: '理性应对能力潜质', level: '优秀', page: '49' }
  ],
  D: [
    { no: 1, name: '实践认知能力潜质', level: '优秀', page: '12' },
    { no: 2, name: '理论认知能力潜质', level: '常态', page: '13' },
    { no: 3, name: '专注性认知能力潜质', level: '常态', page: '14' },
    { no: 4, name: '发散（联想）性认知能力潜质', level: '常态', page: '15' },
    { no: 5, name: '目标动机设定能力潜质', level: '常态', page: '17' },
    { no: 6, name: '目标实现规划能力潜质', level: '常态', page: '18' },
    { no: 7, name: '规划执行决策能力潜质', level: '常态', page: '20' },
    { no: 8, name: '临机决策能力潜质', level: '常态', page: '21' },
    { no: 9, name: '人际凝聚能力潜质', level: '常态', page: '23' },
    { no: 10, name: '人际号召力能力潜质', level: '优秀', page: '24' },
    { no: 11, name: '同质性资源整合能力潜质', level: '常态', page: '26' },
    { no: 12, name: '多样性资源整合能力潜质', level: '常态', page: '27' },
    { no: 13, name: '沟通协调能力潜质', level: '常态', page: '29' },
    { no: 14, name: '冲突管理能力潜质', level: '优秀', page: '30' },
    { no: 15, name: '变革型领导力表型潜质', level: '常态', page: '32' },
    { no: 16, name: '交易型领导力表型潜质', level: '常态', page: '33' },
    { no: 17, name: '愿景型领导力表型潜质', level: '常态', page: '34' },
    { no: 18, name: '安全型领导力表型潜质', level: '常态', page: '35' },
    { no: 19, name: '物理损伤环境适应能力潜质', level: '优秀', page: '37' },
    { no: 20, name: '化工中毒环境适应能力潜质', level: '优秀', page: '38' },
    { no: 21, name: '生物过敏环境适应能力潜质', level: '常态', page: '39' },
    { no: 22, name: '强体力劳动环境适应能力潜质', level: '优秀', page: '40' },
    { no: 23, name: '精细操作职业适应能力潜质', level: '常态', page: '41' },
    { no: 24, name: '数学计算职业适应能力潜质', level: '常态', page: '42' },
    { no: 25, name: '社交职业适应能力潜质', level: '常态', page: '43' }
  ],
  E: [
    { no: 1, name: '艺术关注能力潜质', level: '常态', page: '11' },
    { no: 2, name: '艺术认知能力潜质', level: '常态', page: '12' },
    { no: 3, name: '艺术想象能力潜质', level: '常态', page: '14' },
    { no: 4, name: '艺术设计能力潜质', level: '常态', page: '15' },
    { no: 5, name: '艺术情感升华能力潜质', level: '常态', page: '17' },
    { no: 6, name: '艺术创作能力潜质', level: '常态', page: '18' },
    { no: 7, name: '表演艺术认知能力潜质', level: '常态', page: '21' },
    { no: 8, name: '表演技能潜质', level: '优秀', page: '22' },
    { no: 9, name: '歌唱艺术认知能力潜质', level: '常态', page: '23' },
    { no: 10, name: '歌唱技能潜质', level: '常态', page: '24' },
    { no: 11, name: '演奏艺术认知能力潜质', level: '常态', page: '25' },
    { no: 12, name: '演奏技能潜质', level: '常态', page: '26' },
    { no: 13, name: '绘画艺术认知能力潜质', level: '常态', page: '27' },
    { no: 14, name: '绘画艺术能力潜质', level: '常态', page: '28' },
    { no: 15, name: '舞蹈艺术认知能力潜质', level: '常态', page: '29' },
    { no: 16, name: '舞蹈技能潜质', level: '卓越', page: '30' },
    { no: 17, name: '文学艺术认知能力潜质', level: '常态', page: '31' },
    { no: 18, name: '文学技能潜质', level: '常态', page: '32' }
  ],
  F: [
    { no: 1, name: '体育运动损伤修复能力潜质', level: '优秀', page: '15' },
    { no: 2, name: '体育运动心功能匹配能力潜质', level: '优秀', page: '16' },
    { no: 3, name: '肌肉收缩力能力潜质', level: '优秀', page: '17' },
    { no: 4, name: '肌肉爆发力能力潜质', level: '常态', page: '18' },
    { no: 5, name: '反应速度能力潜质', level: '常态', page: '19' },
    { no: 6, name: '动作速度能力潜质', level: '常态', page: '20' },
    { no: 7, name: '位移速度能力潜质', level: '常态', page: '21' },
    { no: 8, name: '有氧耐力能力潜质', level: '优秀', page: '22' },
    { no: 9, name: '无氧耐力能力潜质', level: '优秀', page: '23' },
    { no: 10, name: '平衡精控能力潜质', level: '卓越', page: '24' },
    { no: 11, name: '灵活变位能力潜质', level: '优秀', page: '25' },
    { no: 12, name: '闭式体育运动认知能力潜质', level: '常态', page: '27' },
    { no: 13, name: '闭式体育运动技能学习能力潜质', level: '常态', page: '28' },
    { no: 14, name: '开式体育运动认知能力潜质', level: '常态', page: '29' },
    { no: 15, name: '开式体育运动技能学习能力潜质', level: '常态', page: '30' },
    { no: 16, name: '体育运动心理承受能力潜质', level: '常态', page: '32' },
    { no: 17, name: '体育运动意志力能力潜质', level: '优秀', page: '33' },
    { no: 18, name: '个人体力运动技能应用能力潜质', level: '优秀', page: '35' },
    { no: 19, name: '个人脑力运动技能应用能力潜质', level: '常态', page: '36' },
    { no: 20, name: '个人对抗运动技能应用能力潜质', level: '常态', page: '37' },
    { no: 21, name: '团队对抗运动技能应用能力潜质', level: '常态', page: '38' }
  ],
}
export const geneBookOf = code => GENE_BOOKS.find(b => b.code === code)

/* ================= 外部系统同步：基因报告「每人一份」 =================
   说明：报告由外部基因检测系统按固定格式同步过来，同一个「本人报告ID」下
   只包含该人实际检测过的若干篇（A~F 的子集），不是每个人都会有全部 6 篇。
   本系统不产生、不修改报告内容，只记录同步结果、篇目范围与版本。 */
/* 年龄口径：按「具体周岁」一岁一册，不做区间合并（7 岁就是 7 岁，不是 7–8 岁或 7–12 岁）。
   外部系统的建议文库本身就是按年龄分册的（如「男 0」「男 7」），
   因此匹配键 = 姓名 + 具体年龄，同一份报告在不同年龄对应不同分册内容。 */
export const ADVICE_AGE_MIN = 0
export const ADVICE_AGE_MAX = 18
export const ADVICE_MATCH_RULE = '姓名 + 具体年龄（周岁）→ 对应培育建议'
export function ageAt(birthday, at = '2026-11-12') {
  const [y, m, d] = String(at).split('-').map(Number)
  const [by, bm, bd] = String(birthday || '').split('-').map(Number)
  if (!by || !bm) return null
  let age = y - by - ((m < bm || (m === bm && d < bd)) ? 1 : 0)
  if (age < 0) age = 0
  return age
}
export const ageLabelOf = age => (age === null || age === undefined || Number.isNaN(Number(age))
  ? '岁数待补' : `${Number(age)} 岁`)
export const adviceKeyOf = (name, age) => `${name}｜${ageLabelOf(age)}`

/* 初始同步的基因报告：一人一份，篇目按人不同。姓名 / 生日取自本报告封面字段口径。 */
export const INITIAL_GENE_REPORTS = [
  { id: 'GR-202309200003', childId: 'C202611001', reportNo: '202309200003', idNo: '4403**********0021', name: '陈一诺', gender: '女', birthday: '2016-05-12',
    age: 10, parentName: '李苰榕', parentRelation: '母子', phone: '150****0000',
    issuer: '《数智生命》总部', filedAt: '2026-11-12', syncedAt: '2026-11-12 09:20',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABCDEF', status: '已同步' },
  { id: 'GR-202401150028', childId: 'C202611003', reportNo: '202401150028', idNo: '4403**********0044', name: '林小满', gender: '女', birthday: '2017-02-19',
    age: 9, parentName: '林女士', parentRelation: '母女', phone: '138****0021',
    issuer: '《数智生命》总部', filedAt: '2026-11-12', syncedAt: '2026-11-12 09:20',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABCD', status: '已同步' },
  { id: 'GR-202505060063', childId: 'C202611004', reportNo: '202505060063', idNo: '4403**********0056', name: '周予安', gender: '男', birthday: '2018-11-07',
    age: 8, parentName: '周先生', parentRelation: '父子', phone: '139****0088',
    issuer: '《数智生命》总部', filedAt: '2026-11-12', syncedAt: '2026-11-12 09:20',
    source: '外部基因检测系统', version: 'v1.0', books: 'BDF', status: '已同步' },
  { id: 'GR-202611070001', childId: 'C202611007', reportNo: '202611070001', idNo: '4403**********0088', name: '陈一然', gender: '男', birthday: '2018-03-08',
    age: 8, parentName: '陈女士', parentRelation: '母子', phone: '138****6621',
    issuer: '《数智生命》总部', filedAt: '2026-11-13', syncedAt: '2026-11-13 09:10',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABCD', status: '已同步' },
  { id: 'GR-202611080002', childId: 'C202611008', reportNo: '202611080002', idNo: '4403**********0095', name: '陈一可', gender: '女', birthday: '2020-09-21',
    age: 6, parentName: '陈女士', parentRelation: '母女', phone: '138****6621',
    issuer: '《数智生命》总部', filedAt: '2026-11-10', syncedAt: '2026-11-10 10:20',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABC', status: '已同步' },
  { id: 'GR-202611090003', childId: 'C202611009', reportNo: '202611090003', idNo: '4403**********0108', name: '陈一航', gender: '男', birthday: '2014-12-02',
    age: 11, parentName: '陈女士', parentRelation: '母子', phone: '138****6621',
    issuer: '《数智生命》总部', filedAt: '2026-11-12', syncedAt: '2026-11-12 11:05',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABCDEF', status: '已同步' },
  { id: 'GR-202611100004', childId: 'C202611010', reportNo: '202611100004', idNo: '4403**********0115', name: '陈一舟', gender: '女', birthday: '2016-07-30',
    age: 10, parentName: '陈女士', parentRelation: '母女', phone: '138****6621',
    issuer: '《数智生命》总部', filedAt: '2026-11-12', syncedAt: '2026-11-12 16:40',
    source: '外部基因检测系统', version: 'v1.0', books: 'AB', status: '已同步' },
  { id: 'GR-202611110005', childId: 'C202611012', reportNo: '202611110005', idNo: '4403**********0139', name: '陈一澜', gender: '男', birthday: '2019-05-06',
    age: 7, parentName: '陈女士', parentRelation: '母子', phone: '138****6621',
    issuer: '《数智生命》总部', filedAt: '2026-11-11', syncedAt: '2026-11-11 09:00',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABCDE', status: '已同步' },
  { id: 'GR-202611120006', childId: 'C202611013', reportNo: '202611120006', idNo: '4403**********0146', name: '陈一澄', gender: '女', birthday: '2020-12-05',
    age: 5, parentName: '陈女士', parentRelation: '母女', phone: '138****6621',
    issuer: '《数智生命》总部', filedAt: '2026-11-12', syncedAt: '2026-11-12 09:30',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABC', status: '已同步' },
  { id: 'GR-202211030019', childId: 'SELF', reportNo: '202211030019', idNo: '4403**********1021', name: '陈女士（本人）', gender: '女', birthday: '1986-06-19',
    age: 40, parentName: '本人', parentRelation: '本人', phone: '150****0000',
    issuer: '《数智生命》总部', filedAt: '2026-11-12', syncedAt: '2026-11-12 09:20',
    source: '外部基因检测系统', version: 'v1.0', books: 'ABCD', status: '已同步' },
]

/* ================= 外部系统同步：培育建议「一份基因报告对应一份」 =================
   培育建议由外部系统按基因报告输出，按「姓名 + 具体年龄（周岁）」匹配到对应年龄分册，
   7 岁匹配 7 岁册、8 岁匹配 8 岁册，不按区间合并；
   报告与建议都有固定格式，本系统只用同步与更新，不做内容生产、编辑或发布。
   每 4 个月同步一版，后台保留全部历史版本，家长端只看当前生效的那一版。 */
export const ADVICE_CYCLE_MONTHS = 4
export const INITIAL_ADVICE_VERSIONS = [
  { id: 'AV2026-11', name: 'V2026.11', status: '当前生效', cycle: '2026-11 ~ 2027-02',
    effectiveAt: '2026-11-12', nextUpdateAt: '2027-03-12', syncedAt: '2026-11-12 09:20',
    source: '外部培育建议系统', note: '按姓名 + 具体年龄匹配对应年龄分册，输出本周期建议，覆盖已同步的 7 份基因报告。', operator: '系统同步' },
  { id: 'AV2026-07', name: 'V2026.07', status: '已归档', cycle: '2026-07 ~ 2026-10',
    effectiveAt: '2026-07-10', nextUpdateAt: '2026-11-10', syncedAt: '2026-07-10 09:05',
    source: '外部培育建议系统', note: '上一周期建议，已由 V2026.11 覆盖，仅供后台回溯。', operator: '系统同步' },
  { id: 'AV2026-03', name: 'V2026.03', status: '已归档', cycle: '2026-03 ~ 2026-06',
    effectiveAt: '2026-03-06', nextUpdateAt: '2026-07-06', syncedAt: '2026-03-06 08:40',
    source: '外部培育建议系统', note: '首版建议，现仅供后台回溯。', operator: '系统同步' }
]
export const ADVICE_CURRENT_VERSION_ID = 'AV2026-11'

export const ADVICE_FORMAT = {
  cover: ['本人姓名', '性别', '出生日期', '本人报告ID', '年龄', '家长姓名', '与本人关系', '报告出品', '建档日期'],
  sections: ['分级内容', '分级举例', '培育方向', '培育建议'],
  note: '与基因报告一致，采用外部系统定义的固定版式；本系统不修改正文内容。'
}

/* 同步过来的建议正文样例：按各人实际同步的篇目，取该篇真实专项潜质与数据熵，
   四段文案取自客户《天赋培育开发建议文库数据库》，由外部系统匹配后推送，
   这里只保存推送结果快照，本系统运行时不参与内容生成。 */
const AD = (book, factor, level, chapter, extra = 0) => {
  const t = ADVICE_TEXT[level]
  return { book, bookName: GENE_BOOKS.find(b => b.code === book)?.name || '', chapter,
    factor, entropy: level + '级', content: t[0], example: t[1], direction: t[2], suggestion: t[3],
    variant: extra + 1 }
}
const ADVICE_TEXT = {
  '卓越': [
    '该项潜质表现处于同龄人前列，相关能力在自然状态下启动早、完成度高，具备进一步发展的先天基础。',
    '在日常学习与活动中更容易表现出稳定的优势，面对新任务时适应快、波动小，能持续保持较高的参与水平。',
    '以提供更具挑战的任务与展示机会为主要方向，避免因重复练习削弱兴趣。',
    '在保持兴趣的前提下适度增加复杂度，配合阶段性目标，让优势有可展示的出口。',
  ],
  '优秀': [
    '该项潜质发展良好，基础条件较为扎实，具备在现有水平上继续提升的空间。',
    '多数情境下能稳定完成对应任务，遇到稍复杂的安排时经过引导可以较快适应。',
    '在现有基础上逐步增加任务复杂度，用阶段性目标巩固优势。',
    '保持规律接触与练习节奏，定期回顾表现变化，再决定是否需要提高投入强度。',
  ],
  '常态': [
    '该项潜质表现平稳，处于同龄人的常见区间，各项指标符合该年龄段的一般规律。',
    '在日常情境中表现稳定，没有明显超前或滞后，受环境与状态影响较小。',
    '以夯实基础为核心，维持稳定供给与规律节奏，促进各方面协调发育。',
    '以兴趣引导为主，先保证接触频率，不急于设定量化目标，观察后续变化。',
  ],
  '弱态': [
    '该项潜质的先天表现相对偏弱，发展节律容易受外界条件影响，需要更耐心的陪伴。',
    '面对对应任务时启动略慢，完成度波动较明显，需要更多示范与重复机会。',
    '以早期介入与基础保障为主要方向，循序渐进而非集中强化。',
    '维持稳定的作息与养育环境，从小步骤开始，定期观察变化后再调整节奏。',
  ],
}

/* 一个分册对应一份建议书：按分册编码（A~F）各取该册前 2 个潜质要素作为同步条目，
   数据熵按「首项优秀 + 次项常态」固定搭配，四段文案仍取自《天赋培育开发建议文库》，
   保证每份建议书只包含本分册的内容，不跨分册混编。 */
const ADVICE_SECTIONS_OF = books => String(books).split('').filter(Boolean).flatMap(code => {
  const gb = GENE_BOOKS.find(b => b.code === code)
  const pool = ELEMENT_ITEMS.filter(x => x.book === code)
  return ['优秀', '常态'].map((level, i) => {
    const el = pool[i % pool.length]
    const chapter = gb ? gb.chapters[i % gb.chapters.length] : ''
    return el ? AD(code, el.name, level, chapter, i) : null
  }).filter(Boolean)
})

const ADVICE_DOCS_RAW = [
  { id: 'AD-202309200003-202611', geneReportId: 'GR-202309200003', reportNo: '202309200003', idNo: '4403**********0021', name: '陈一诺',
    gender: '女', birthday: '2016-05-12', age: 10, matchKey: '陈一诺｜10 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-12 09:20', source: '外部培育建议系统', books: 'ABCDEF',
    sections: ADVICE_SECTIONS_OF('ABCDEF') },
  { id: 'AD-202611070001-202611', geneReportId: 'GR-202611070001', reportNo: '202611070001', idNo: '4403**********0088', name: '陈一然',
    gender: '男', birthday: '2018-03-08', age: 8, matchKey: '陈一然｜8 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-13 09:10', source: '外部培育建议系统', books: 'ABCD',
    sections: ADVICE_SECTIONS_OF('ABCD') },
  { id: 'AD-202611080002-202611', geneReportId: 'GR-202611080002', reportNo: '202611080002', idNo: '4403**********0095', name: '陈一可',
    gender: '女', birthday: '2020-09-21', age: 6, matchKey: '陈一可｜6 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-10 10:20', source: '外部培育建议系统', books: 'ABC',
    sections: ADVICE_SECTIONS_OF('ABC') },
  { id: 'AD-202611090003-202611', geneReportId: 'GR-202611090003', reportNo: '202611090003', idNo: '4403**********0108', name: '陈一航',
    gender: '男', birthday: '2014-12-02', age: 11, matchKey: '陈一航｜11 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-12 11:05', source: '外部培育建议系统', books: 'ABCDEF',
    sections: ADVICE_SECTIONS_OF('ABCDEF') },
  { id: 'AD-202611100004-202611', geneReportId: 'GR-202611100004', reportNo: '202611100004', idNo: '4403**********0115', name: '陈一舟',
    gender: '女', birthday: '2016-07-30', age: 10, matchKey: '陈一舟｜10 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-12 16:40', source: '外部培育建议系统', books: 'AB',
    sections: ADVICE_SECTIONS_OF('AB') },
  { id: 'AD-202611110005-202611', geneReportId: 'GR-202611110005', reportNo: '202611110005', idNo: '4403**********0139', name: '陈一澜',
    gender: '男', birthday: '2019-05-06', age: 7, matchKey: '陈一澜｜7 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-11 09:00', source: '外部培育建议系统', books: 'AB',
    sections: ADVICE_SECTIONS_OF('AB') },
  { id: 'AD-202611120006-202611', geneReportId: 'GR-202611120006', reportNo: '202611120006', idNo: '4403**********0146', name: '陈一澄',
    gender: '女', birthday: '2020-12-05', age: 5, matchKey: '陈一澄｜5 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-12 09:30', source: '外部培育建议系统', books: 'ABC',
    sections: ADVICE_SECTIONS_OF('ABC') },
  { id: 'AD-202401150028-202611', geneReportId: 'GR-202401150028', reportNo: '202401150028', idNo: '4403**********0044', name: '林小满',
    gender: '女', birthday: '2017-02-19', age: 9, matchKey: '林小满｜9 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-12 09:20', source: '外部培育建议系统', books: 'ABCD',
    sections: ADVICE_SECTIONS_OF('ABCD') },
  { id: 'AD-202505060063-202611', geneReportId: 'GR-202505060063', reportNo: '202505060063', idNo: '4403**********0056', name: '周予安',
    gender: '男', birthday: '2018-11-07', age: 8, matchKey: '周予安｜8 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-12 09:20', source: '外部培育建议系统', books: 'BDF',
    sections: ADVICE_SECTIONS_OF('BDF') },
  { id: 'AD-202211030019-202611', geneReportId: 'GR-202211030019', reportNo: '202211030019', idNo: '4403**********1021', name: '陈女士（本人）',
    gender: '女', birthday: '1986-06-19', age: 40, matchKey: '陈女士（本人）｜40 岁',
    versionId: 'AV2026-11', versionName: 'V2026.11', status: '当前生效',
    syncedAt: '2026-11-12 09:20', source: '外部培育建议系统', books: 'ABCD',
    sections: ADVICE_SECTIONS_OF('ABCD') },
]

/* 发布状态：外部系统同步过来即视为「已发布」（家长端可见），
   后台可逐份「撤回」（家长端立即不可见）后再「发布」恢复；
   撤回 / 发布只影响该份建议对家长的可见性，不修改任何正文。
   演示里保留一份已撤回（本人 40 岁那份，儿童培育建议本就不适用），用于展示发布动作。 */
export const ADVICE_PUBLISH_STATES = ['已发布', '已撤回']
export const INITIAL_ADVICE_DOCS = ADVICE_DOCS_RAW.map(d => {
  /* 建议与报告同时发布：种子里的当前版建议一律「已发布」，
     撤回只在后台演示操作里发生，不再预置“报告可读但建议已撤回”的矛盾状态。 */
  return {
    ...d,
    publishStatus: '已发布',
    publishedAt: d.syncedAt,
    withdrawnAt: '',
    opAt: d.syncedAt,
    opBy: '系统同步'
  }
})

/* 历史版本快照：每个归档版本下、每人也有一份当时的建议（项数少于当前版）。
   仅用于后台「历史版本」回溯，家长端永远只读当前生效版本。 */
export function buildAdviceHistoryDocs(docs, versions) {
  const archived = (versions || []).filter(v => v.id !== ADVICE_CURRENT_VERSION_ID)
    .sort((a, b) => String(b.effectiveAt).localeCompare(String(a.effectiveAt)))
  const out = []
  archived.forEach((v, idx) => {
    const cut = idx + 1
    docs.forEach(d => {
      const keep = Math.max(1, (d.sections || []).length - cut)
      const age = ageAt(d.birthday, v.effectiveAt)
      out.push({
        ...d,
        id: `${d.id.split('-').slice(0, -1).join('-')}-${v.id.slice(2).replace('-', '')}`,
        versionId: v.id, versionName: v.name, status: '已归档',
        age, matchKey: adviceKeyOf(d.name, age),
        syncedAt: v.syncedAt, publishStatus: '已发布', publishedAt: v.syncedAt,
        withdrawnAt: '', opAt: v.syncedAt, opBy: '系统同步',
        sections: (d.sections || []).slice(0, keep)
      })
    })
  })
  return out
}

/* 同步日志：外部系统每次推送都留痕，后台可查，家长端不可见 */
export const INITIAL_SYNC_LOGS = [
  { id: 'SL001', at: '2026-11-12 09:20', system: '外部培育建议系统', target: '培育建议 V2026.11',
    scope: '7 份基因报告', result: '成功', detail: '按姓名 + 具体年龄匹配对应年龄分册，整版同步完成' },
  { id: 'SL002', at: '2026-11-12 09:18', system: '外部基因检测系统', target: '基因报告 v1.0',
    scope: '7 人 / 篇目按人同步', result: '成功', detail: 'A~F 六篇按各人实际检测范围同步' },
  { id: 'SL003', at: '2026-07-10 09:05', system: '外部培育建议系统', target: '培育建议 V2026.07',
    scope: '上一周期', result: '成功', detail: '已由 V2026.11 覆盖归档' }
]

/* 潜质要素文库（外部系统按性别 + 具体年龄同步）：数据量较大，单独成文件 */
export * from './element-lib.js?v=1.61.0'
