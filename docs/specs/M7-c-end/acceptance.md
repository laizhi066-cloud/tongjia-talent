# M7 C 端门户 · 验收与追溯

> 状态：**M7-F C 端收口与验收（2026-11-17，implementer-m7f / task-42）**。M7-A..E 已交付；本轮修复 3 个跨组件/接口缺陷（确认弹层、页头双返回、方向全局档位），完成 H5 真实登录全链路与 390/340 矩阵。真机 / 微信胶囊 / 暗色 / 法务文本仍未验证，逐项标注。
> 依据：[M7 规格](spec.md)、[ADR 0007](../../adr/0007-m7-client-portal.md)、[UX 基线](ux-baseline.md)；PRD v1.1 §5.2（L122–140）/ §7（L341–418）/ §10（L581–589）/ §11（L591–602）/ §12（L604–630）；[M2 规格](../M2-members/spec.md) §7、[M3 规格](../M3-reports/spec.md) §7、[M4 规格](../M4-matching/spec.md) §7、[M5 规格](../M5-advice/spec.md) §7、[M6 规格](../M6-cleanup/spec.md) §7。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`。证据必须是命令/可复现步骤 + 退出码 + 关键输出，不能只写「已实现」。

## 1. 范围与前置

- **验收对象**：`docs/specs/M7-c-end/spec.md` 的 4 主栏 + 15 二级页、登录/停用/注销、对象切换、首页、报告/分册/要素/PDF、培育建议、培养方向、我的/孩子/协议/隐私/关于、C 端 API 与守卫、视觉与双端门禁。
- **实现任务**：M7（待派发，建议按 spec §16 拆 M7-A..F）。
- **前置依赖（未就绪则相关项只能记「未验证」）**：

| # | 前置 | 状态（2026-11-17） | 影响的验收项 |
| --- | --- | --- | --- |
| P1 | M1 规则域（分级/注解/方向/档位）已验收 | **已验收**（[M1 acceptance](../M1-rules/acceptance.md)） | 分册数据熵、固定注解、方向要素对照 |
| P2 | M2 会员域：`talent_parents/children`、`bindings`、claim、加密/脱敏、查询状态机 | **已实现并验收**（task-9/12/16） | AC-APP-02/03/11/12/15、profile/children 写接口 |
| P3 | M3 报告域：`talent_reports` 快照、`getTalentReportClientSnapshot`、`assertTalentReportPublished`、分册/PDF 边界 | **已实现/收尾中**（task-18/20/21） | AC-APP-04/05/06/07、PDF |
| P4 | M4 方向：`GET /directions`、`POST/PUT/DELETE /selections`、拼音排序 | **已实现**（task-13 纯函数；路由随 M4-B） | AC-APP-09/10 |
| P5 | M5 建议：`GET /advice`、`available=false` 空态、按分册四段 | **实现中**（task-22/24） | AC-APP-08 |
| P6 | M6 清理：旧 C 端 bindings/plans 入口删除、旧报告路由交接 | **规格已出、实现进行中** | AC-APP-15、旧入口 0 |
| P7 | M8 PDF 渲染/水印/时效/文件 | **未开始** | AC-APP-14 的 PDF 真实下载项只能「未验证（依赖 M8）」 |
| P8 | 本地 PocketBase + `.env` + 三账号 Mock（M2/M3/M5 种子）+ H5/MP 构建环境 + 微信开发者工具 | 按 `docs/QUALITY.md` | 全部走查/截图项 |

- **M7 出口（开发计划 L245–249）**：PRD §12 C 端清单全过；390 / 340 无横向溢出、0 控制台错误；微信真机 + H5 双验证。

## 2. 追溯表（AC-APP-01..15）

> 「实现（计划）」按 spec 落点；实现后 verifier 必须核对文件与行号再改状态。「测试 / 证据」给最小可复现命令或步骤，命令输出写入 §4。

| ID | 验收项 | PRD 位置 | 实现（计划） | API / 页面 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| AC-APP-01 | 登录需勾选协议；未勾选不可登录；小程序手机号一键 / 微信兜底 / H5 账号密码可用 | §7.1 L343–346、§12 L620 | S1、spec §3.2–3.3、`useWechatAuthentication`、`FoundationLoginPanel` | `POST /api/client/auth/{wx-phone-login,wx-login,phone-login}` | H5：未勾选点登录 URL 不变、出现「请先阅读并同意」；勾选后 `admin@tongjia.local/admin123` 登录成功（§4.3 A1–A3）。微信授权 / 手机号一键 / 小程序端未验证 | 未验证 |
| AC-APP-02 | 停用账号显示停用页、不能进入主栏；退出回登录；业务接口不泄露数据 | §7.1 L345、§12 L620、§10.5 | S2、spec §3.4、summary `accountState` | `GET /summary`、业务路由 404/403 | 未构造 `users.status=0` / `talent_parents.status=0` 用例；未验证 | 未验证 |
| AC-APP-03 | 首页对象卡 + 六种状态文案正确；待核对提示条数正确 | §7.2 L347–353、§12 L621 | T1、spec §5、§11.2 | `GET /summary` | H5 实测 3 种：本人「该对象暂无基因报告」、子女「2 个分册可读」、另一子女「报告整理中」；待核对 1 人与孩子管理非「已查到」数一致。可读/更新中/查询中/未查询未逐一构造 | 未验证 |
| AC-APP-04 | 报告页固定六册全列；未检测/未开放置灰不可点；表头「6 篇 / 共 6 册 · N 册可读」 | §7.3 L355–361、§12 L622 | T2、spec §6.1 | `GET /reports/:id` | H5：`.volume-row` 6 行、可读 2 / 置灰 4、表头「共 6 册 · 2 册可读」、置灰行无 `data-action` 且不可进入（§4.3 C2–C4） | 通过（H5） |
| AC-APP-05 | 撤回后不列分册、不给下载、建议消失；恢复后恢复 | §7.3 L359、BR-10 L106、§12 L623 | spec §6.1/§6.5/§7.4、§11.2 | 报告/建议/PDF 路由 | 未执行 B 端撤回/恢复；未验证 | 未验证 |
| AC-APP-06 | 分册数据熵筛选、章节分组、要素行无编码、筛选按册记忆、再点取消 | §7.4 L363–368、BR-12 L108、§12 L624 | S4、spec §6.2 | `GET /reports/:id/volumes/:volumeId` | H5：章节分组 + 数据熵 chip + 再点取消通过；页面无 `A-01`/`V1` 编码。按册记忆与跨会话保留未验证 | 未验证 |
| AC-APP-07 | 要素解读：数据熵、天赋解读、适用条件、相关方向、上一项/下一项本册循环、返回来源 | §7.5 L370–372 | S5、spec §6.3 | 同上（`factors[].note/condition/relatedDirections`） | H5：数据熵/天赋解读/相关方向、上一项循环、返回分册通过；下一项循环与返回后保留筛选未验证 | 未验证 |
| AC-APP-08 | 建议按分册、一册一份编号、四段文案、周期说明、`adv:<分册>` 独立筛选；撤回不可见 | §7.6 L374–380、BR-06/07、§12 L625 | S6/S7、spec §7 | `GET /advice?reportId=` | H5：4 册建议卡、编号、版本周期文案、建议书四段（分级内容/分级举例/培育方向/培育建议）、数据熵筛选通过。撤回联动未验证 | 未验证 |
| AC-APP-09 | 方向两页签、命中排序、0 命中「暂无匹配」、空推荐空态、自己填写可提交 | §7.7 L382–390、BR-08/09、§12 L626 | T3/S8/S9、spec §8 | `GET /directions`、`POST /selections` | H5：推荐 5 项（快照临时补齐，测后恢复）、0 命中回退「暂无匹配」横幅、空快照「暂无可推荐方向」、自填「其他（自己填写）」≤10 字提交成功。11 字 422 未验证 | 未验证 |
| AC-APP-10 | 已选上限 3、可取消、可换档；方向下拉拼音排序 + 末位「其他」 | §7.7 L389–390、§12 L627–628 | spec §8.3–8.5 | `PUT/DELETE /selections/:selectionId` | H5：已选 1/3、换档弹层 4 档、自定义方向换档回退全局档位、取消二次确认后 1→0、自填下拉末位「其他（自己填写）」通过。第 4 个选择拦截未验证 | 未验证 |
| AC-APP-11 | 我的四入口 + 关于、孩子管理增改、协议/隐私可打开、注销二次确认 | §7.8 L392–398、§12 L629 | T4/S10–S15、spec §9 | 资料/孩子/协议/隐私/注销 | H5：四入口可进；新增孩子保存成功（列表 2→3）、编辑保存成功；协议/隐私/关于可打开；注销弹层勾选门禁 + 取消通过（未真正注销）。测后已删除测试孩子并恢复资料 | 未验证 |
| AC-APP-12 | 切换对象：本人+子女、四种报告状态、切换后回来源页、同一时刻只呈现一个对象、无串号 | §7.9 L400–402、§12 L621 | S3、spec §4 | `GET /summary?subjectId=`、bindings | H5：本人（无报告）+2 子女（可读/整理中）；切换后回首页并刷新对象卡与最近报告，无串号。四种状态未齐 | 未验证 |
| AC-APP-13 | 加载/空/错/未登录/过期/停用/无权限/弱网状态齐全；不白屏、不显示技术码 | §10.5 L587、§11 L598、UX 基线 §4 | spec §11、§12.7 | 全部页面 | H5：19 页矩阵无白屏、console/pageerror 0；骨架、空态、阻断态可见。断网/超时/401 回跳/停用/无权限未构造 | 未验证 |
| AC-APP-14 | 390/340 无横向溢出、44px、安全区、胶囊、主题令牌、亮暗可读；console 0；H5+MP 构建；wxss 0 失败 | §11 L596、§12 L630、UX 基线 §4 | spec §12/§13 | 页面 + 构建 | H5：390（19 页）+ 340（关键 10 页）矩阵无横向溢出、可点区域 ≥44px（修复方向页签 24px）、console/pageerror 0；`client:build:h5/mp` 通过且 MP 产物 19 页。真机胶囊/暗色/wxss（本机缺 `wcsc`）未验证 | 未验证 |
| AC-APP-15 | 数据权限：本人/已授权子女；解绑/停用/撤回即时失效；越权 404；PDF 仅开放册；响应/日志无明文 | §10 L581–589、§12 | spec §10、§6.5 | 全部 C 端路由 | 本轮仅做 H5 UI；越权/解绑/停用/撤回/响应明文断言未跑（M7-B `talent-client-api.test.ts` 36 项通过） | 未验证 |

### 2.1 PRD §12 C 端清单逐条覆盖核对

| PRD §12 C 端条目（L620–630） | 覆盖 AC |
| --- | --- |
| 登录需勾选协议；停用账号显示停用页 | AC-APP-01/02 |
| 首页对象卡与六种状态文案正确 | AC-APP-03 |
| 报告页六册全列，未检测/未开放置灰不可点 | AC-APP-04 |
| 撤回后不列分册、不给下载、建议消失，恢复后恢复 | AC-APP-05 |
| 分册数据熵筛选、要素行无编码 | AC-APP-06 |
| 建议按分册、四段文案、周期说明 | AC-APP-08 |
| 方向两页签、命中排序、0 命中「暂无匹配」、空推荐空态、自己填写可提交 | AC-APP-09 |
| 已选上限 3、可取消、可换档 | AC-APP-10 |
| 方向下拉按拼音首字母排序 | AC-APP-10 |
| 我的页四入口、孩子管理增改、协议与隐私可打开 | AC-APP-11 |
| 390 / 340 无横向溢出，0 控制台错误 | AC-APP-14 |

> 补充覆盖（PRD §7 逐条但 §12 清单未单列）：切换对象（AC-APP-12）、要素解读（AC-APP-07）、状态完整性（AC-APP-13）、权限与安全（AC-APP-15）、PDF 代理（AC-APP-14 的 PDF 项 + AC-APP-15）。

## 3. 工程红线与跨模块契约

| 需求 | 位置 | 实现（计划） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 单实例、单 PocketBase、无多租户 | AGENTS.md 红线 | 全量 diff | `rg -n "TENANT_MODE\|X-Site-Slug\|site cookie\|site_slug"` 无新增；无第二 PB 连接 | 未验证 |
| 只调 `/api/client/*`，不直连 PB/管理员接口 | CONVENTIONS §4 | `src/api/**`、`http.ts` | `rg -n "/api/admin\|getAdminPB\|POCKETBASE_ADMIN" apps/client/src` 0 命中 | 未验证 |
| 主题只读站点点、无用户外观开关 | AGENTS.md / CONVENTIONS §4 / D4 | `useSiteStore`、`style/index.scss` | `rg` 无主题设置入口/本机主题 key；硬编码色 0 命中（令牌文件除外）；暗色截图 | 未验证 |
| 不恢复旧机构/服务商/培养计划/内容库入口 | PRD §3.2、M6 §7 | 页面/菜单/文案 | `rg -n "机构\|服务商\|培养计划\|内容库\|审核" apps/client/src` 0 命中（客服/后台说明除外） | 未验证 |
| 天赋字段只落 `talent_*`；C 端写接口复用 M2/M4 服务层 | AGENTS.md、spec §1.3 | `server/api/client/talent/**` | 路由 diff 审查：无 `users` 业务字段回填（除中性资料既有）；写接口调用 M2 `talent-member.ts`/`talent-member-crypto.ts`，M4 selection 服务 | 未验证 |
| 手机号/身份证脱敏；密文/哈希不进响应 | PRD §10.2、M2 §3.4 | 投影/sanitize | 接口响应断言无 `mobileCipher/mobileHash/idNoCipher/idNoHash`；无 11 位/18 位明文；日志无 PII | 未验证 |
| 越权一律 404；403 只用于账号停用/权限码 | PRD §10.5、spec §10.4 | 守卫 helper 复用 | 他人子女/解绑/停用/未发布/未开放册逐路由断言 404/409；无 403 泄露存在性 | 未验证 |
| 写接口 Zod + 审计；日志不含敏感信息 | CONVENTIONS §3、PRD §10.3 | `validateBody`/`withOperLog` | profile/children/claim/selections 各 1 条 `oper_logs`；摘要不含证件/手机号/正文 | 未验证 |
| 不恢复 `customerId` / 旧 binding / 旧 `pdfUrl` | M2 §7.3、M3 D6、M6 §7.2 | 新 API/页面 | `rg -n "customerId\|talent_customers\|customer_bindings\|pdfUrl" apps/client/src` 0 命中 | 未验证 |
| 阅读进度不在 M7 范围 | spec §18 U5 | 不建读写接口/页面 | `rg -n "reading-progress\|readItemIds\|阅读进度" apps/client/src` 0 命中 | 不在范围 |
| 演示数据虚构、不写真实 PII | PRD §11 L600 | 截图/证据 | 截图与证据使用 M2/M3/M5 Mock 虚构数据；无真实手机号/身份证/姓名/ token | 未验证 |

## 4. 视觉与双端证据矩阵（M7-F 回填 2026-11-17）

> 截图归档：56 张截图（约 9.2MB）已于 2026-11 移出 Git 仓库，下表 `evidence/*.png` 文件名仅作证据索引保留，文件本体从验收归档包获取。原始截图全部使用演示库虚构数据，无真实 PII。执行环境：H5 dev `http://127.0.0.1:9000` + Nuxt `3000` + 演示 PocketBase `8090`；Chromium 390×844 / 340×844。
> 布局/触控断言为 Playwright 全页扫描：`scrollWidth-clientWidth<=0`、可点元素（button/role=button/cell/tab/chip/card 等）宽高均 ≥44px、console error 与 pageerror 计数 0。

### 4.1 截图矩阵（H5，M7-F 实测）

| 证据 ID | Surface | 宽度 / 主题 | 页面状态 | 截图路径 | console | 执行人 | 日期 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V-M7F-001 | 登录页 | 390 / 亮 | 未勾选 / 已勾选 | `evidence/m7f-login-390.png`、`m7f-login-390-checked.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-002 | 首页 | 390 / 亮 | 本人（无报告）/ 子女（有报告） | `evidence/m7f-home-390-self.png`、`m7f-home-390-child.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-003 | 切换对象 | 390 / 亮 | 本人 + 2 子女 | `evidence/m7f-subject-390.png`、`v-m7f-subject-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-004 | 报告主栏 | 390 / 亮 | 已发布 2 册 | `evidence/m7f-report-390.png`、`v-m7f-report-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过（6 行 / 2 可读 / 4 置灰） |
| V-M7F-005 | 分册页 | 390 / 亮 | 筛选前 / 筛选后 | `evidence/m7f-volume-390.png`、`m7f-volume-390-filtered.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-006 | 要素解读 | 390 / 亮 | 有相关方向 | `evidence/m7f-factor-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-007 | 建议列表 / 建议书 | 390 / 亮 | 4 册 / 四段 / 筛选后 | `evidence/m7f-advice-390.png`、`m7f-advice-detail-390.png`、`m7f-advice-detail-390-filtered.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-008 | 培养方向 | 390 / 亮 | 推荐 5 项 | `evidence/m7f-direction-390-recommend.png` | 0 | implementer-m7f | 2026-11-17 | 通过（快照临时补齐，测后恢复） |
| V-M7F-009 | 培养方向 | 390 / 亮 | 0 命中回退 | `evidence/v-m7f-direction-390-fallback.png` | 0 | implementer-m7f | 2026-11-17 | 通过（临时快照，测后恢复） |
| V-M7F-010 | 培养方向 | 390 / 亮 | 空快照 | `evidence/v-m7f-direction-390-empty.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-011 | 已选 / 换档 / 取消 | 390 / 亮 | 1/3、档位弹层、取消后空 | `evidence/m7f-direction-390-selected.png`、`m7f-direction-390-tiertip.png`、`m7f-direction-390-selected-empty.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-012 | 方向详情 | 390 / 亮 | 要素对照 + 4 档位 | `evidence/m7f-direction-detail-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-013 | 自己填写 | 390 / 亮 | 全局 4 档位 + 「其他」输入 | `evidence/m7f-manual-390.png`、`v-m7f-manual-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过（M7-D 缺口修复） |
| V-M7F-014 | 我的 / 退出确认 / 注销确认 | 390 / 亮 | 正常 + 二次确认 | `evidence/m7f-profile-390.png`、`m7f-logout-dialog-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过（M7-E 弹层缺陷修复） |
| V-M7F-015 | 编辑资料 | 390 / 亮 | 默认 | `evidence/m7f-profile-edit-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过（昵称保存并回显） |
| V-M7F-016 | 孩子管理 | 390 / 亮 | 2 人 / 新增后 3 人 / 编辑后 | `evidence/m7f-children-390.png`、`m7f-children-390-added.png`、`m7f-children-390-edited.png`、`m7f-child-form-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过（测后删除测试孩子） |
| V-M7F-017 | 协议 / 隐私 / 关于 / 停用页 | 390 / 亮 | — | `evidence/v-m7f-agreement-390.png`、`v-m7f-privacy-390.png`、`v-m7f-about-390.png`、`v-m7f-locked-390.png` | 0 | implementer-m7f | 2026-11-17 | 通过 |
| V-M7F-018 | 19 页全量矩阵 | 390 / 亮 | 全部路由 | `evidence/v-m7f-<page>-390.png`（19 页） | 0 | implementer-m7f | 2026-11-17 | 通过（0 溢出 / 0 触控违规） |
| V-M7F-019 | 关键 10 页矩阵 | 340 / 亮 | 全部关键路由 | `evidence/v-m7f-<page>-340.png`（10 页） | 0 | implementer-m7f | 2026-11-17 | 通过（0 溢出 / 0 触控违规） |
| V-M7F-020 | 真机 iOS / Android 微信 | — | — | — | — | — | — | 未验证（本机无真机/开发者工具运行环境） |
| V-M7F-021 | 暗色主题 / 微信胶囊 / 安全区 | — | — | — | — | — | — | 未验证（亮色 H5 + CSS 安全区变量已用，暗色与胶囊未跑） |

> 与原始骨架（V-M7-001..040）的映射：骨架中的暗色、真机、注销成功、撤回等项保持未验证；其余页面状态由 V-M7F 系列覆盖。

### 4.2 自动/半自动检查证据

| 证据 ID | 检查项 | 命令 / 方法 | 退出码 | 关键输出 | 执行人 | 日期 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E-M7-001 | C 端类型 | `pnpm client:typecheck` | 0 | `vue-tsc --noEmit` 无错误 | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-002 | C 端 lint | `pnpm --filter foundation-portal lint` | 0 | 0 error（与构建并发时曾因文件遍历竞态退出 2，单独重跑 0） | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-003 | H5 构建 | `pnpm client:build:h5` | 0 | `DONE Build complete.` | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-004 | 小程序构建 | `pnpm client:build:mp` | 0 | `DONE Build complete.`；`apps/client/dist/build/mp-weixin/app.json` pages = 19 | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-005 | WXSS 原生检查 | `pnpm client:check:wxss` | 1 | `未找到微信 WXSS 编译器，请设置 WECHAT_WXSS_COMPILER` | implementer-m7f | 2026-11-17 | 未验证（本机缺 wcsc，按门禁细则不得当通过） |
| E-M7-006 | 服务端类型 | `pnpm typecheck` | 0 | 仅既有 duplicated imports WARN | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-007 | C 端路由/投影测试 | `pnpm vitest run test/talent-client-api.test.ts` | 0 | 36 tests passed | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-008 | 全量回归 | `pnpm test` | — | 未运行（超出 M7-F 范围，M9 统一跑） | — | — | 未验证 |
| E-M7-009 | C 端 smoke | `scripts/e2e/07-m7-client.mjs` | — | 仓库无该脚本；本轮用 `/tmp/m7f/walkthrough.mjs`（66/66 通过）替代 | implementer-m7f | 2026-11-17 | 通过（替代脚本） |
| E-M7-010 | H5 console / 溢出 / 44px | Playwright 33 次页面审计 + 66 项全链路断言 | 0 | console/pageerror 0；overflow 0；44px 违规 0（修复方向页签后） | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-011 | 小程序 console | 微信开发者工具 + 真机 console | — | 未运行 | — | — | 未验证 |
| E-M7-012 | Wot lint | `wot_lint`（dir=`apps/client`） | — | 本轮未调用（组件仅用 wd-popup/wd-button/wd-checkbox，均 Wot 2.2.0 已支持 API） | — | — | 未验证 |
| E-M7-013 | 硬编码色/Emoji | `grep -rnE "#[0-9a-fA-F]{3,8}|rgb\(" apps/client/src/{pages,modules}`；Emoji 扫描 | 0 | 0 命中 | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-014 | 旧口径 0 命中 | `grep -rnE "customerId|talent_customers|customer_bindings|pdfUrl|机构|服务商|培养计划|内容库" apps/client/src` | 0 | 仅「检测机构」正常业务文案命中；无旧入口/旧字段 | implementer-m7f | 2026-11-17 | 通过 |
| E-M7-015 | 响应无密文/明文 | 接口断言脚本 | — | 未跑（M7-B 测试覆盖，见 E-M7-007） | — | — | 未验证 |
| E-M7-016 | 越权 404 / 状态 409 | 接口用例脚本 | — | 未跑（M7-B 测试覆盖） | — | — | 未验证 |
| E-M7-017 | 写接口审计 | 查 `oper_logs` | — | 未核对 | — | — | 未验证 |
| E-M7-018 | PDF 门禁 | H5 点击「下载本册 PDF」 | 0 | ticket 地址返回 `content-type: application/pdf` 且 200；未开放册/撤回/越权未跑 | implementer-m7f | 2026-11-17 | 未验证（仅真实下载通过） |

### 4.3 M7-F H5 真实登录全链路（66/66 通过）

脚本：`/tmp/m7f/walkthrough.mjs`（Chromium 390×844，真实登录 `admin@tongjia.local`，演示库 `8090`）。关键断言：

| 组 | 断言 | 结论 |
| --- | --- | --- |
| 登录 | 未勾选协议点登录不跳转且提示；勾选后 H5 账号密码登录成功 | 通过 |
| 首页 / 对象 | 本人无报告卡、切换对象页 3 行、切到子女后对象卡与最近报告刷新 | 通过 |
| 报告 | 6 册目录、2 可读/4 置灰、表头文案、分册章节、数据熵筛选与取消 | 通过 |
| PDF | 点击下载打开新页签，`/pdf?ticket=` 返回 `application/pdf` 200 | 通过 |
| 要素 | 数据熵/天赋解读/相关方向、上一项循环、返回分册 | 通过 |
| 建议 | 4 册建议卡、版本周期说明、建议书四段、数据熵筛选 | 通过 |
| 方向 | 推荐 5 项、详情要素对照、选档选择、已选 1/3、换档、取消二次确认、自填「其他」提交、自定义方向换档回退全局档位 | 通过 |
| 孩子 | 列表 2 人、新增保存后 3 人、编辑保存成功 | 通过 |
| 资料 | 编辑页加载、昵称保存并在「我的」回显 | 通过 |
| 退出 | 退出二次确认弹层出现、取消仍登录、确认后回登录页 | 通过 |
| 稳定性 | 全流程 console error 0、pageerror 0 | 通过 |

### 4.4 本轮缺陷修复与验证

| 缺陷 | 修复 | 验证 |
| --- | --- | --- |
| Wot 2.2.0 `wd-dialog` 声明式 props 不生效（M7-E） | `PortalConfirmDialog.vue` 改为 `wd-popup` 自绘确认弹层，保留 `v-model` / `@confirm` / `loading` / 勾选门禁接口；同时修 `wd-cell` 退出登录缺少 `clickable` 导致点击不触发 | 退出确认打开→取消→确认、注销勾选门禁、loading 禁用均通过 |
| `PortalPageHeader` 双返回（M7-E） | 移除 `wd-navbar` 上重复的 `@click-left`（左插槽按钮已触发一次）；删除 `useProfileBack` 600ms 去重 hack | 我的→协议 返回 1 次回到我的；孩子→新增→返回 1 次回到孩子列表 |
| `GET /directions` 缺全局档位（M7-D） | 响应新增 `tiers` / `manualTiers`（快照 tiers ∩ 当前启用；快照无档位回退当前启用），更新 shared/client 类型；自填页与自定义方向换档改用全局档位 | API 返回 4 档；空快照演示库自填页仍有 4 个培养目标候选，不再「暂未开放培养目标」 |

### 4.5 演示库恢复

- 验收期间临时补齐 `talent_reports.directionSnapshot.directions` 以获得非空推荐 / 0 命中回退证据；结束后已恢复为 `directions: []`、`selections: []`（`snapshotVersion` 仍为 1）。
- 测试新增的孩子（`验收子女`/`验收子女改`）与 `talent_direction_requests` 记录已删除；`users(nickname/avatar)` 已恢复为「客户管理员」/空。
- 复核：孩子 2 人（演示子女一/二）、方向请求 0、报告 selections 0、方向快照 directions 0；未改动 M2/M3/M4/M5 其他业务数据。

## 5. 测试命令与门禁

```bash
# 1. C 端
pnpm client:typecheck
pnpm client:lint
pnpm client:build:h5
pnpm client:build:mp
pnpm client:check:wxss

# 2. 服务端
pnpm typecheck
pnpm vitest run test/talent-client-api.test.ts
pnpm test

# 3. 主链 smoke（M7 新增；M9 重写 04-client.mjs 全量）
node scripts/e2e/07-m7-client.mjs

# 4. 联调
pnpm pb
pnpm dev
pnpm --filter foundation-portal dev:h5   # http://127.0.0.1:9000
pnpm client:dev                          # 微信开发者工具
```

| 门禁 | 通过判据 | 对应证据 | M7-F 结论 |
| --- | --- | --- | --- |
| G1 类型/lint | `client:typecheck`、`client:lint`、`pnpm typecheck` 0 error | E-M7-001/002/006 | 通过（全仓 `pnpm lint` 也 0） |
| G2 构建 | H5/MP 构建成功；产物页面数 19；无旧页面残留 | E-M7-003/004、E-M7-014 | 通过（MP `app.json` pages=19） |
| G3 WXSS | `client:check:wxss` 0 失败（本机缺 `wcsc` 时明确失败，不得当通过） | E-M7-005 | 未验证（本机缺 wcsc，退出码 1 已记录） |
| G4 接口 | `talent-client-api.test.ts` 全绿：守卫/越权/409/契约字段/无明文 | E-M7-007/015/016/017 | 部分：36 项单测通过；E-M7-015/016/017 未跑 |
| G5 回归 | `pnpm test` 全绿（M1–M6 既有不变红） | E-M7-008 | 未验证（M7-F 未跑全量） |
| G6 视觉 | 截图 ≥60、console 0、390/340 无溢出、44px 断言、亮暗可读 | V-M7F-001..019、E-M7-010 | 部分：56 张、console 0、0 溢出、44px 0 违规；暗色未跑 |
| G7 真机 | iOS/Android 微信关键 6 页无遮挡/无报错 | V-M7-020、E-M7-011 | 未验证（无真机环境） |
| G8 红线 | 无硬编码品牌色、无 Emoji、无多租户/第二 PB、无旧机构/计划入口、无 PII 明文 | E-M7-013/014/015 | 部分：E-M7-013/014 0 命中；PII 响应断言未跑 |

## 6. 实施后回填规则

1. 每完成一个阶段（spec §16 的 M7-A..F），verifier 在 §2 把对应 AC 从「未验证」改为「通过/未通过」，并在 §4 增加证据行；**没有证据不得写通过**。
2. 「未通过」必须写清失败命令、期望/实际、文件与行号、复现步骤；修复后重跑并保留两次输出。
3. 依赖未就绪（如 M8 PDF）只能标「未验证」，不得用「部分通过」掩盖；确需部分验收时拆成子项（门禁/交互/文件）。
4. 待裁决项（spec §18 U1–U6）在裁决前保持「待裁决」，不得按实现者偏好写「通过」。
5. 收尾：`git diff --check` 通过；确认只改允许的 docs 路径（本任务）或按实现任务范围；截图证据放 `docs/specs/M7-c-end/evidence/` 且脱敏。

> 2026-11-17 lead 补充（真实数据）：导入张杰凯 6 册/156 要素/原版 PDF 后，C 端报告页显示 6 分册、可读 6/6、建议 2 份；分册 PDF 走 ticket + 原版 PDF，微信小程序 `uni.downloadFile` + `uni.openDocument(fileType:'pdf')` 预览/下载。
