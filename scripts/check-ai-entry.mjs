#!/usr/bin/env node
/**
 * 校验 AI 工具入口文件与 AGENTS.md 的一致性。
 *
 * 规则：
 * 1. AGENTS.md 的「AI 工具入口」表格里登记的每个文件都必须存在。
 * 2. 入口文件必须是实体文件，不能用软链（Windows 检出会把软链变成文本文件）。
 * 3. 每个入口都要指向 AGENTS.md，并带上关键红线的关键词。
 * 4. 入口文件不能整段复制 AGENTS.md（行数上限保护）。
 *
 * 用法：pnpm check:ai
 */
import { readFileSync, existsSync, lstatSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const AGENTS = join(ROOT, 'AGENTS.md')

if (!existsSync(AGENTS)) {
  console.error('✗ 找不到 AGENTS.md')
  process.exit(1)
}

const agentsText = readFileSync(AGENTS, 'utf8')

/** 取出「AI 工具入口」小节正文 */
function section(text, title) {
  const start = text.indexOf(`## ${title}`)
  if (start < 0) return ''
  const rest = text.slice(start + title.length)
  const end = rest.indexOf('\n## ')
  return end < 0 ? rest : rest.slice(0, end)
}

const entrySection = section(agentsText, 'AI 工具入口')
if (!entrySection) {
  console.error('✗ AGENTS.md 缺少「## AI 工具入口」小节')
  process.exit(1)
}

/** 表格第二列里用反引号包住的路径 */
const registered = [...entrySection.matchAll(/^\|\s*[^|]+\|\s*`([^`]+)`/gm)]
  .map((m) => m[1].trim())
  .filter((p) => p && !p.includes(' '))

if (registered.length === 0) {
  console.error('✗ 「AI 工具入口」表格没有登记任何文件')
  process.exit(1)
}

const REQUIRED_TERMS = [
  ['TENANT_MODE', '红线：单实例单 PocketBase'],
  ['talent_*', '红线：天赋字段只落 talent_*'],
  ['setup.mjs', '红线：setup.mjs 不是迁移工具'],
  ['天赋正式开发交接包', '商务与验收依据：报价单与原型位置'],
  ['talent-prototype', '商务与验收依据：验收基线原型'],
]
const MAX_ADAPTER_LINES = 100

const errors = []
const checked = []

for (const rel of registered) {
  const abs = join(ROOT, rel)
  if (!existsSync(abs)) {
    errors.push(`${rel}：表格已登记，但文件不存在`)
    continue
  }

  const stat = lstatSync(abs)
  if (stat.isSymbolicLink()) {
    errors.push(`${rel}：不能是软链，请改为实体文件（其余入口在 Windows 检出后会失效）`)
    continue
  }
  if (!stat.isFile()) {
    errors.push(`${rel}：不是普通文件`)
    continue
  }

  const text = readFileSync(abs, 'utf8')

  // AGENTS.md 自身就是事实来源，后面的检查不适用
  if (rel === 'AGENTS.md') {
    checked.push({ rel, note: '事实来源' })
    continue
  }

  if (!/AGENTS\.md/.test(text)) {
    errors.push(`${rel}：没有指向 AGENTS.md`)
  }

  const missing = REQUIRED_TERMS.filter(([k]) => !text.includes(k))
  if (missing.length) {
    errors.push(`${rel}：缺少必备内容 ${missing.map(([k, why]) => `${k}（${why}）`).join('、')}`)
  }

  const lines = text.split('\n').length
  if (lines > MAX_ADAPTER_LINES) {
    errors.push(`${rel}：${lines} 行，超过 ${MAX_ADAPTER_LINES} 行上限；入口只放红线与指路，不要复制 AGENTS.md`)
  }

  checked.push({ rel, lines, size: stat.size })
}

// 反向检查：磁盘上已有但表格漏登记的常见入口
const KNOWN = [
  'CLAUDE.md',
  'GEMINI.md',
  '.clinerules',
  '.cursor/rules/000-project.mdc',
  '.github/copilot-instructions.md',
  '.windsurf/rules/project.md',
  '.trae/rules/project_rules.md',
]
for (const rel of KNOWN) {
  if (existsSync(join(ROOT, rel)) && !registered.includes(rel)) {
    errors.push(`${rel}：文件存在但未在「AI 工具入口」表格登记`)
  }
}

if (errors.length) {
  console.error('✗ AI 入口校验未通过：')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`✓ AI 入口校验通过：${checked.length} 个入口`)
for (const c of checked) {
  console.log(`  ${c.note ? '·' : '✓'} ${c.rel}${c.lines ? `（${c.lines} 行）` : ''}`)
}

// 提示 CLAUDE.md 的导入写法是否还在
const claude = join(ROOT, 'CLAUDE.md')
if (existsSync(claude)) {
  const text = readFileSync(claude, 'utf8')
  if (!/@AGENTS\.md/.test(text)) {
    console.warn('⚠ CLAUDE.md 未使用 @AGENTS.md 导入，请确认其内容与 AGENTS.md 同步')
  }
  if (statSync(claude).size < 200) {
    console.warn('⚠ CLAUDE.md 体积过小，可能已被软链替换成占位文件')
  }
}
