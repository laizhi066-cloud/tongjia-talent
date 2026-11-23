# 天赋系统本地闭环

本文件说明如何在本地把天赋业务跑通：PocketBase 准备、新库初始化、种子链、启动顺序、演示账号、验收路径和菜单口径。
分支现状、账号总表与已知缺口见 [STATUS.md](STATUS.md)；脚本逐条说明见 [SCRIPT-GUIDE.md](SCRIPT-GUIDE.md)。

## 1. PocketBase 二进制

仓库**不包含** `pocketbase/pocketbase`（已在 `.gitignore`）。默认从仓库根目录查找，可用 `POCKETBASE_BINARY` 覆盖：

```bash
# 检查解析结果
pnpm env:doctor
# ✓ PocketBase: /.../tongjia-talent/pocketbase/pocketbase
```

缺失时按 [QUICK-START.md](QUICK-START.md#1-前置条件) 下载 `0.38.1`，或用 `.env` 指向已有二进制：

```dotenv
POCKETBASE_BINARY=/absolute/path/to/pocketbase
```

## 2. 本地环境文件

在仓库根目录创建 `.env`（不入库），最少填写：

```dotenv
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_PUBLIC_URL=http://127.0.0.1:8090
NUXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=请替换为本地强密码
ENCRYPTION_KEY=请替换为至少32位随机字符串

# 数据目录留空即用仓库内 pb_data/；需要独立库时改成绝对路径
# POCKETBASE_DATA_DIR=/absolute/path/to/pb_data

# 本地必须关闭 OSS，避免把测试 PDF 写进生产对象存储
OSS_ENABLED=false

# M8 外部三源默认 mock；本地不需要真实供应商配置
TALENT_GENE_QUERY_SOURCE=mock
TALENT_GENE_REPORT_SOURCE=mock
TALENT_ADVICE_SOURCE=mock

# M8 PDF：本地默认开启，ticket 120s；字体缺失时按仓库默认候选解析
TALENT_PDF_ENABLED=1
TALENT_PDF_STORAGE=auto
```

`.env.example` 已包含上述键与 M8 完整键名，`cp .env.example .env` 后按需修改即可。**不要把 `.env` 提交到 Git，也不要在本地打开 `OSS_ENABLED=true`**。

## 3. 从零初始化

`env:setup` 只接受全新的空数据目录：

```bash
pnpm install
pnpm env:doctor      # 确认二进制、数据目录、地址
pnpm env:setup       # 创建 34 个集合、菜单、角色、站点配置与初始超管
pnpm accounts:seed   # 追加 superAdmin / admin / reviewer / rule-config 四个后台账号
```

若提示检测到旧业务集合，说明目标目录不是新库：在 `.env` 指定新的绝对路径后重试，**不要**删除或复用旧库。存量库升级 schema / 菜单 / 权限用 `pnpm talent:sync`；旧集合归零用 `pnpm migration:m6`（默认 dry-run）。

## 4. 种子链（规则 → 会员 → 报告 → 建议）

四个种子脚本均幂等 upsert，只写自己域内的集合，不清空其他天赋数据：

```bash
TALENT_RULE_SEED_CONFIRM=rule          pnpm talent:rule:seed
TALENT_MEMBER_SEED_CONFIRM=member      pnpm talent:member:seed
TALENT_REPORT_SEED_CONFIRM=report      pnpm talent:report:seed
TALENT_ADVICE_SEED_CONFIRM=YES         pnpm talent:advice:seed
```

顺序不能颠倒：报告种子按会员种子定位家长 / 子女；建议种子按报告种子的 `talent_gene_reports` 派生版本。

| 步骤 | 命令 | 写入内容 |
| --- | --- | --- |
| 1 规则 | `pnpm talent:rule:seed` | 4 个分级、4 个目标档位、1 个分库（男 0 岁）× 158 个潜质要素、632 条固定注解、6 个培养方向；只写 M1 规则域集合 |
| 2 会员 | `pnpm talent:member:seed` | 1 名演示家长「演示家长」（手机 `13800000001`）+ 2 名子女「演示子女一」（已查到）/「演示子女二」（未查到，信息不一致）；含密文 + HMAC + 脱敏三件套 |
| 3 报告 | `pnpm talent:report:seed` | 2 份报告：`R202611160001` 待发布（外部 A/B 册、未开放）、`R202611160002` 已发布（外部 A/B/C/D 册、开放 A/B 册），以及对应 `talent_gene_reports`（一人一份） |
| 4 建议 | `pnpm talent:advice:seed` | 2 个建议版本：1 个当前生效 + 1 个已归档（跨一个 4 个月周期） |

种子脚本只允许连接 `127.0.0.1` 或 `localhost`，`NODE_ENV=production` 时直接拒绝；`talent:rule:seed` / `talent:member:seed` / `talent:report:seed` / `talent:advice:seed` 各自要求对应的确认变量。

> 跑过 `pnpm e2e` 之后，报告 / 会员数量可能大于种子值（用例会新建数据且不全部回滚），属正常现象；不要为了「干净」在生产库重跑任何种子脚本。

## 5. 演示账号

后台账号由 `pnpm accounts:seed` 创建，口令可用环境变量覆盖；未覆盖时为本地 dev 默认值（生产必须覆盖）：

| 账号 | 本地默认口令 | 角色 | 用途 |
| --- | --- | --- | --- |
| `superAdmin` | `laizhi066` | 运维超管 | 全部菜单（含系统管理 / 运行监控） |
| `admin` | `admin123` | 平台运营管理员（`customer-admin`） | 会员 / 报告 / 建议 / 规则全量业务 |
| `reviewer` | `reviewer123` | 报告审核员 | 工作台 / 会员只读 / 报告 / 建议发布撤回 |
| `rule-config` | `ruleconfig123` | 规则配置员 | 工作台 + 天赋规则 3 页 + 方向归并 |

邮箱分别为 `superadmin@tongjia.local` / `admin@tongjia.local` / `reviewer@tongjia.local` / `ruleconfig@tongjia.local`，登录可使用账号名或邮箱。

**C 端演示账号**：种子链不创建 C 端用户，也不自动写 `talent_parents.userId`。本地任选一种方式建立关系：

1. 用 `admin@tongjia.local` 登录后台「会员管理」，编辑「演示家长」并绑定 C 端账户；或
2. 用 C 端中性账户登录后调用 `POST /api/client/talent/bindings/claim`（微信已验证手机号哈希命中唯一 parent 时才写入）。

之后用该中性账户登录 C 端 H5 / 小程序即可看到「演示家长」与两名子女。M7 收口验收在演示库使用 `admin@tongjia.local` 走通 H5 登录全链路；C 端默认口令变量为 `TALENT_MOCK_CLIENT_PASSWORD`（默认 `TalentMock123!`），仅本地使用。

## 6. 启动

```bash
pnpm pb                                        # 终端 1，127.0.0.1:8090
pnpm dev                                       # 终端 2，127.0.0.1:3000
pnpm --filter foundation-portal dev:h5         # 终端 3，C 端 H5 127.0.0.1:9000
```

也可以用 `pnpm dev:all` 一条命令拉起三者。地址分别是 `127.0.0.1:8090`、`127.0.0.1:3000`、`127.0.0.1:9000`。

## 7. 本地验收顺序

1. `superAdmin` 登录后台，确认侧栏只有工作台 / 会员管理 / 天赋规则（潜质要素、分级与固定注解、培养方向管理）/ 报告管理（基因报告、培育建议）/ 系统管理 / 运行监控；`admin`、`reviewer`、`rule-config` 只看到各自业务菜单。
2. 工作台核对会员、报告、建议、规则缺口等待办计数；接口权限码为 `talent:dashboard:list`。
3. 规则域：潜质要素按左分册 + 右侧单行表格查看 / 导出 / 同步；分级与固定注解为左右主从页（左侧要素、右侧分级阶梯 + 注解）；培养方向管理配置要素分级与目标档位，并可从「待归并方向」归并自填方向。
4. 会员管理：列表四筛 + 详情 3 页签（名下子女 / 关联报告 / 账号资料）；新建家长 + 多子女；子女就地编辑 / 重新查询 / 解绑；证件全号需 `talent:parent:idno` 并写操作日志。
5. 基因报告：列表 10 列 + 四项筛选 + 状态计数；详情 4 页签；一键同步 preview / commit；发布 → 撤回 → 恢复 → 补发 → 重新生成快照。
6. 培育建议：15 列列表、版本历史、接收新一版 preview / commit、发布 / 撤回、导出；报告详情第 4 页签按报告取建议。
7. 集成状态：`superAdmin` 在 `GET /api/admin/talent/integrations/status` 查看三源类型 / 配置完整性 / 最近运行 / 熔断与 PDF 队列；默认 mock 源应显示未配置 external。
8. C 端用已绑定家长的中性账户登录：首页对象切换、报告主栏（状态卡 + 6 册目录）、分册页、要素解读、培育建议、培养方向推荐 / 选择 / 换档 / 自填、孩子管理、资料编辑、PDF 下载、退出登录。
9. 用另一个 C 端账号读取同一报告，确认返回 404；家长停用 / 子女解绑后旧链接即时失效。

## 8. 管理端菜单与字段口径

真实菜单（`http://127.0.0.1:3000/admin`，超级管理员视角）：

```text
工作台                /admin/talent/dashboard
会员管理              /admin/talent/member
天赋规则
  ├ 潜质要素         /admin/talent/rules/factor
  ├ 分级与固定注解   /admin/talent/rules/level
  └ 培养方向管理     /admin/talent/rules/direction
报告管理
  ├ 基因报告         /admin/talent/reports
  └ 培育建议         /admin/talent/advice
系统管理（仅 superAdmin）
  └ 用户列表 / 菜单管理 / 角色管理 / 部门管理 / 岗位管理 / 字典管理 / 参数设置 / 站点配置 / 微信配置
运行监控（仅 superAdmin）
  └ 系统健康 / 服务器信息 / 在线用户 / 错误监控 / 操作日志 / 登录日志
```

M6 已删除的旧入口（服务商授权、培养计划审核、分类与要素、匹配规则、内容库与培育内容、报告接收、同步配置、机构管理、机构端会员 / 报告 / 计划）不再出现在菜单中，对应页面与 API 均为 404。

列表只展示业务决策所需字段和更新时间；创建时间、创建人、更新人和内部编号统一放入「查看详情」。分类、要素、分级编码、样式与内容版本不在业务页面展示；编码由系统自动生成。

第三方报告同步后，系统按内部模板校验完整要素，依据「结果 → 分级 → 固定注解 → 年龄/性别条件 → 培养内容」匹配链生成并固化快照；同一 `externalReportId` 重复回传会跳过，已发布报告不会覆盖。报告状态只有待发布、已发布、已撤回和异常；C 端只读取已发布报告和已开放分册。

## 9. M8 PDF 与外部源本地验证

- **PDF**：本地保持 `OSS_ENABLED=false`，PDF 写入 PocketBase 私有存储；`TALENT_PDF_ENABLED=1` 时，对已发布且本册开放的 C 端报告调用 `GET /api/client/talent/reports/:id/volumes/:volumeId/pdf` 应流式返回 PDF；未发布 / 未开放应 404 `PDF_NOT_READY`。H5 先取 `pdf-ticket`，小程序走 `uni.downloadFile`。
- **外部源**：默认三源为 `mock`，可完整走通同步 preview / commit；切换 `external` 前必须配置基址、`TALENT_EXTERNAL_APP_ID`、≥32 字符的 `TALENT_EXTERNAL_API_SECRET`，否则接口返回 503 `EXTERNAL_SOURCE_UNAVAILABLE`。生产环境三源为 mock 且未设 `TALENT_ALLOW_MOCK_SOURCES=1` 时启动失败。
- **入站 webhook**：需要 `TALENT_EXTERNAL_WEBHOOK_SECRET`；无签名 / 过期时间窗 / 重放 nonce 均拒绝。

## 10. 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `pnpm env:doctor` 报找不到二进制 | 仓库不含 PocketBase | 按 [QUICK-START.md](QUICK-START.md#1-前置条件) 放入 `pocketbase/pocketbase` 或设 `POCKETBASE_BINARY` |
| `pnpm env:setup` 报缺少 RBAC 权限菜单 | 权限码与菜单不匹配 | 先确认代码与脚本为同一版本；新库重置数据目录后重试 |
| `pnpm env:setup` 拒绝执行 | 目标目录已有业务集合 | 改用新的 `POCKETBASE_DATA_DIR`；存量库用 `pnpm talent:sync` |
| 种子脚本提示缺少确认变量 | 未设置 `TALENT_*_SEED_CONFIRM` | 按 §4 对应命令显式设置；不要绕过确认门槛 |
| 报告种子找不到子女 | 未先跑会员种子或家长被解绑 | 先跑 `talent:member:seed`，再按 §4 顺序重跑 |
| 上传 PDF 后对象存储里出现测试文件 | 本地 `.env` 打开了 `OSS_ENABLED=true` | 改回 `false` 并重启 Nuxt |
| C 端登录后显示未绑定家长 | 新库种子未写 `talent_parents.userId` | 按 §5 在后台绑定或走 claim 认领 |
| C 端 404 / 跨域 | `VITE_SERVER_BASEURL` 或 H5 代理前缀不一致 | 核对 `apps/client/env/.env.development`，重启 H5 构建 |
| PDF 报「字体不可用」 | 未找到中文字体 | 配置 `TALENT_PDF_FONT_PATH` 指向 Noto Sans SC 等 TTF/OTF |