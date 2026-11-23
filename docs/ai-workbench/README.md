# AI 研发工作台（当前阶段）

> 只读看板：[board.html](board.html)（浏览器直接打开；数据源 `.dsh-kanban.json`，可用 `pnpm ai:board` 重新生成）。DSH 侧栏「看板」是可编辑版，本页只是快照。

> 性质：工作台约定与操作手册，2026-11-16 建立。工具会变，规则以 `AGENTS.md`、`docs/CONVENTIONS.md`、`docs/QUALITY.md` 为准。

## 1. 目标

把 PRD 变成可执行、可验收的模块交付，而不是让 agent 直接“看着 PRD 写代码”。

```text
PRD → 模块 spec → 任务卡 → worktree 实现 → 独立验收 → 合并 → 验收追溯
```

## 2. 已安装/已启用

| 能力 | 状态 | 用途 |
| --- | --- | --- |
| `@alpacachen/dsh-kanban@1.11.2` | 已安装，看板入口「看板」 | M1–M9 任务卡、状态、验收列；数据在各工作区 `.dsh-kanban.json` |
| `@deepseek-ai/dsh-experimental-tool-worktree` | 已安装，重启后生效 | agent 创建/进入独立 Git worktree |
| `@deepseek-ai/dsh-experimental-session-search` | 已安装，重启后生效 | 搜历史会话，跨天接续 |
| Agent Teams | 内置，无需安装 | 共享任务板、teammate、Lead 审核 |
| 项目技能 `.dsh/skills/` | 已建立 7 个 | 规格、交付、schema、门禁、追溯、review、小程序 UX |
| Wot UI 官方 AI 接入 | `wot agent init --client deepseek` 已执行 | `.agents/skills/wot-ui-v2` + `.dsh/wot-ui.json` + `~/.dsh/open-wot` bridge；首次需重启 DSH，MCP 查询需新会话 |
| C 端体验基线 | [M7 UX 基线](../specs/M7-c-end/ux-baseline.md) | 390/340、44px、状态、微信胶囊、Wot 使用审计 |

看板用法：左侧「看板」→ 选择工作区 → 卡片详情里可「创建新对话」，把卡片内容带入新会话。看板数据格式为 v6，文件 `.dsh-kanban.json` 可随仓库备份，但不要提交客户敏感信息。

## 3. 角色与模型

| 角色 | 模型 | 职责 | 不做什么 |
| --- | --- | --- | --- |
| Lead / 总控 | `deepseek-v4.1-flash-1017`（复杂规划临时切 `deepseek-v4-pro`） | 拆任务、定边界、合并、对人汇报 | 不长时间占用一个实现任务 |
| Architect | `qwen4-max`（仅规格/ADR，限次）；`qwen3.8-max` / `deepseek-v4-pro` 兜底 | 模块 spec、ADR、数据/API 合同 | 不写业务代码 |
| Implementer | `deepseek-v4.1-flash-1017`（默认）；失败再升 `deepseek-v4-pro` | schema、API、B/C 端页面、测试 | 不跨模块改无关文件 |
| Verifier | `glm-5.3` | 独立验收、跑门禁、给证据 | 不改实现；只写验收记录 |
| Bulk | `qwen3.8-flash` / `deepseek-v4.1-flash-1017` | 摘要、grep、文库解析、文档同步 | 不做架构决策 |

模型路由在「插件 → 子智能体 → 模型选择」里开启；一次最多 2 个写 agent + 1 个 verifier。

### 成本路由

| 档 | 模型 | 用在哪 | 目标 token 占比 |
| --- | --- | --- | --- |
| 经济 | `deepseek-v4.1-flash-1017`、`qwen3.8-flash` | 默认实现、读代码、摘要、批量 | ≈80% |
| 推理 | `deepseek-v4-pro`、`qwen3.8-max` | flash 失败后的升级、复杂状态机/快照设计 | ≈15% |
| 旗舰 | `qwen4-max` | M0 口径裁决、M1 规格/ADR、最终验收 | ≈5% |
| 评审 | `glm-5.3` | 独立 review；换模型族降低同源盲点 | 按任务 |

规则：**默认 flash；只有 flash 在具体任务上失败、或任务涉及跨域状态机/验收裁决时才升级。** 每个任务卡记录用了哪个模型；每周看一次升级率和返工率，再调整。不要用旗舰模型跑全仓库扫描。

## 4. 任务卡

每张卡至少写：

```markdown
## 目标
一句话，可验收。

## 输入
- spec: docs/specs/<module>/spec.md
- 相关文件/调用链

## 允许改
- 文件/目录白名单

## 不要改
- 旧口径代码、无关页面、`.env`、`pb_data/`

## 验收
- AC 编号
- 命令：`pnpm typecheck` / 定向 vitest / 新库烟测

## 交付
- 分支/worktree
- 证据：命令 + 退出码 + 截图/日志路径
```

看板列建议：`Backlog / Ready / In Progress / Review / Done`，`Review` 即人工/verifier 验收列。

## 5. Worktree 规则

- 一个模块一个 worktree：`git worktree add ../tongjia-m1 -b codex/m1-rules`。
- 一个文件同一时间只有一个写者；并行任务在任务卡里写明文件白名单。
- 合并顺序：M1 → M2/M4 → M3 → M5 → M6/M7 → M8；C 端等 API 合同冻结。
- 不在主工作树并行跑多个写 agent；Lead 负责最终 diff 和门禁。

## 6. 每轮节奏

1. **Plan**：Lead 读 PRD/现状，写/更新 spec 与任务卡。
2. **Implement**：Implementer 在 worktree 内完成最小闭环，自己先跑定向检查。
3. **Verify**：Verifier 用独立上下文跑门禁，写 PASS/FAIL 证据；发现问题回到 2。
4. **Review**：Lead 看 diff、调用点、权限、schema、文档；必要时跑完整门禁。
5. **Merge**：合并后更新 `docs/STATUS.md`、`docs/API.md`、验收追溯表。

## 7. 当前试点：M1 规则域

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| 规格 + ADR | 完成（v1.1） | `docs/specs/M1-rules/spec.md`、`docs/adr/0001-m1-rule-domain.md` |
| 数据层 | 完成 | 6 集合 / 类型 / 种子 / 领域工具；`pnpm typecheck`、171 tests、临时新库计数通过 |
| API + 权限菜单 | 完成 | 31 条路由、15 权限码、3 C 菜单；`typecheck`、193 tests、静态路由冒烟通过 |
| B 端三页 | 完成（待验收） | 方向 / 要素 / 分级三页 + composable；`typecheck`、`nuxt build`、mock 页面烟测 console 0 |
| 独立验收 | **PASS** | verifier 临时 PB 新库：133/133 schema、种子 4/4/158/632/6、sync 幂等、31 路由、15 权限码、23/23 页面检查；`acceptance.md` 已填 |
| 出口 | **达成（M1）** | AC-ADM-04/05 全过；AC-ADM-03-4 真实链路留 M3；F1/F2/F3 已处理/登记；P0 密钥止血仍需人工执行 |

看板：M1 卡片在 `.dsh-kanban.json`，Done 7 张；Backlog 剩 P0 密钥止血与 M3 方向删除保护待办。

## 8. 安全前置

开工前必须处理：`.env`、`.deploy.env`、`cc-connect-config.toml` 被 Git 跟踪，且含明文密钥。步骤见 `docs/specs/M0/security-remediation.md`。未完成前，不让 agent 读取或上传这些文件。

## 9. 不要做

- 不装 BMAD/Spec Kit 整套框架，不建第二套事实源。
- 不把整份 PRD 塞给实现 agent；只给任务卡 + spec + 文件列表。
- 不让 agent 自己宣布完成；没有命令证据就不算完成。
- 不在 `danger-full-access` 下跑不可信第三方插件；实现阶段用 `workspace-write`。
- 不把客户姓名、身份证、手机号原文贴进模型对话或截图。