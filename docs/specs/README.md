# 模块规格（docs/specs）

本目录是「PRD → 可执行实现合同」的落点：实现 agent 按 spec 写代码，验收 agent 按 acceptance 填证据。**只在 `docs/specs/` 写文档，不写代码**；涉及数据/接口/页面的口径变更先改规格，再改实现。

## 索引

| 里程碑 | 规格 | 状态 | 实现任务 | 关联决策 |
| --- | --- | --- | --- | --- |
| M0 | [密钥止血与仓库卫生](M0/security-remediation.md) | 待人工执行（`.env` 仍被 Git 跟踪） | — | — |
| M1 | [规则域规格](M1-rules/spec.md)（文库 / 分级 / 固定注解 / 培养方向 / 档位） | **已验收（2026-11-16）** | task-1 规格 / task-2+4+5 实现 / task-3 验收 | [ADR 0001](../adr/0001-m1-rule-domain.md) |
| M1 | [规则域验收与追溯](M1-rules/acceptance.md) | 已填证据：33/36 通过、0 未通过、2 未验证（M3 依赖） | task-3 | [ADR 0001](../adr/0001-m1-rule-domain.md) |
| M2 | [会员域需求](M2-members/requirements.md) / [规格](M2-members/spec.md) / [验收](M2-members/acceptance.md) | **已验收（2026-11-17）** | task-6/7 规格 / task-9+12+14 实现 / task-16 验收 | [ADR 0002](../adr/0002-m2-member-domain.md) |
| M3 | [报告域规格](M3-reports/spec.md) / [验收](M3-reports/acceptance.md) | **已验收（2026-11-17）**：14 条后台端点、快照 / 状态机 / 版本链 | task-10 规格 / task-18+20+21 实现 / task-33 验收 | [ADR 0003](../adr/0003-m3-report-domain.md) |
| M4 | [方向匹配规格](M4-matching/spec.md) / [验收](M4-matching/acceptance.md) | **已验收（2026-11-17）**：纯函数 / 待归并 / 后台选择；C 端 4 条归 M7 | task-11 规格 / task-13+27+30 实现 / task-34 验收 | [ADR 0004](../adr/0004-m4-direction-matching.md) |
| M5 | [培育建议规格](M5-advice/spec.md) / [验收](M5-advice/acceptance.md) | **已验收（2026-11-17）**：9 条后台端点、版本两层、15 列页面 | task-19 规格 / task-22+24+28 实现 / task-34 验收 | [ADR 0005](../adr/0005-m5-advice-domain.md) |
| M6 | [清理与三角色规格](M6-cleanup/spec.md) / [验收](M6-cleanup/acceptance.md) / [实现清单](M6-cleanup/m6b-implementation.md) | **代码清理完成（2026-11-17）；真实数据删除未执行**；验收合同待 verifier 回填 | task-23 规格 / task-41+43 实现 | [ADR 0006](../adr/0006-m6-cleanup-and-roles.md) |
| M7 | [C 端规格](M7-c-end/spec.md) / [验收](M7-c-end/acceptance.md) / [UX 基线](M7-c-end/ux-baseline.md) | **已收口（2026-11-17，M7-F）**：4 主栏 + 19 路由；真机 / 胶囊 / 暗色 / 法务文本未验证 | task-25 规格 / task-31+36+38+39+40+42 实现与收口 | [ADR 0007](../adr/0007-m7-client-portal.md) |
| M8 | [外部接口与 PDF 规格](M8-external/spec.md) / [验收](M8-external/acceptance.md) | **骨架完成，验收取证中（2026-11-17）**：PDF / ticket / 入站 / 集成状态已实现；真实供应商未联调 | task-26 规格 / task-32+35 实现 / task-44 回填 | [ADR 0008](../adr/0008-m8-integration-pdf.md) |
| M9 | [质量与发布规格](M9-quality/spec.md) / [验收](M9-quality/acceptance.md) | **验收进行中（2026-11-17，verifier 取证）**：最终发布判定以 acceptance 为准 | task-29 规格 / task-44 验收 | [ADR 0009](../adr/0009-m9-quality-release.md) |

架构决策记录（ADR）在 [docs/adr/](../adr/)，编号递增：

| 编号 | 决策 |
| --- | --- |
| [0001](../adr/0001-m1-rule-domain.md) | M1 规则域：集合命名与旧集合共存、方向 JSON 契约、注解名称去留、导入预览、权限码与菜单过渡 |
| [0002](../adr/0002-m2-member-domain.md) | M2 会员域：旧数据不迁移、单 parentId、账号绑定 claim、停用唯一真源、三件套加密、查询状态机、解绑归档、菜单共存 |
| [0003](../adr/0003-m3-report-domain.md) | M3 报告域：快照 JSON、一人一份、增量分册、版本链、同步幂等、旧数据过渡 |
| [0004](../adr/0004-m4-direction-matching.md) | M4 方向匹配：级序命中、四键排序、快照输入、0 命中回退、别名归并、上限 |
| [0005](../adr/0005-m5-advice-domain.md) | M5 培育建议：版本两层/单一生效、sections JSON、同步即发布、与 M3 派生联动、年龄口径 |
| [0006](../adr/0006-m6-cleanup-and-roles.md) | M6 清理与三角色：备份门槛、旧集合/路由/菜单删除顺序、角色矩阵、回滚 |
| [0007](../adr/0007-m7-client-portal.md) | M7 C 端：4 栏 15 页、Wot 优先、对象切换、登录退化、PDF 边界 |
| [0008](../adr/0008-m8-integration-pdf.md) | M8 外部与 PDF：三源适配器 / 拉取 / 渲染 / 水印 / 私有存储 / 告警 / 回滚 |
| [0009](../adr/0009-m9-quality-release.md) | M9 质量与发布：验收事实源分层、E2E 重写、性能门槛、安全门禁、发布回滚、差异签字 |

## 写作规则

1. 每条需求引用 PRD 章节（必要时带行号），不整段复制 PRD；PRD 与旧代码冲突时写「待裁决」，不静默二选一。
2. 集合名必须是 `talent_*`；PRD 字段与 PocketBase 字段不一致时给映射表（M1 spec §3.8 是范例）。
3. 必须写清：范围 / 不在范围、角色与权限码、字段与唯一索引、状态与版本规则、API 与错误码、页面字段与交互、导入导出、验收映射、未决项、测试命令。
4. 未决项集中在 spec 末尾「未决项」表，标明裁决人；裁决结论回写到实现任务卡，并更新 spec 版本。
5. 验收文档用固定状态：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`；证据 = 命令 + 退出码 + 关键输出，不能只写「已实现」。
6. 高风险改动（schema / 认证 / 权限 / 上传）按 [docs/QUALITY.md](../QUALITY.md) 升级验证，命令与证据写进 acceptance，不写「构建成功=已验收」。
7. 收尾必须跑 `git diff --check`，并确认只改了允许的 docs 路径。

## 相关入口

- 工程规则：[AGENTS.md](../../AGENTS.md)、[docs/CONVENTIONS.md](../CONVENTIONS.md)、[docs/DEVELOPMENT.md](../DEVELOPMENT.md)、[docs/QUALITY.md](../QUALITY.md)
- 需求基线：[PRD v1.1](../天赋正式开发交接包/同佳天赋专项PRD-2026-11-16.md)
- 开发计划与里程碑：[天赋专项正式开发计划](../implementation/天赋专项正式开发计划-2026-11-16.md)
- 现状与门禁快照：[docs/STATUS.md](../STATUS.md)