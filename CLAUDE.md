# 同佳天赋 · Claude Code 入口

完整工程规则通过下方导入加载，本文件不复制内容。

@AGENTS.md

## 读取顺序

1. [docs/STATUS.md](docs/STATUS.md)：当前分支、服务、账号、门禁结果与已知缺口。
2. [docs/CONVENTIONS.md](docs/CONVENTIONS.md)：不可违背的编码、API 与数据规则。
3. 任务对应的专题文档，见 `AGENTS.md` 的「文档地图」。

### 若导入未生效

部分环境会忽略 `@` 导入。此时**必须先完整读取同目录 `AGENTS.md`**，再开始改动；本文件与 `AGENTS.md` 冲突时，以 `AGENTS.md` 为准。

## 三句红线

- 单实例、单 PocketBase，不做多租户（不加 `TENANT_MODE`、`site` cookie、`X-Site-Slug`）。
- 天赋字段只落 `talent_*` 集合，不回填 `users`、`configs`、`site_config`。
- `scripts/setup.mjs` 只初始化空数据目录，发现旧业务集合必须失败，它不是迁移或清库工具。

## 商务与验收依据

`docs/天赋正式开发交接包/` 放天赋专项的报价单、逐行功能清单、流程图与可运行原型，是验收口径的依据。

- 两端合计 48,000 元：后台管理 36,000 + C 端小程序 12,000，以 `同佳天赋专项报价单.xlsx` 为准。
- 原型为 2026-09 四端旧口径（含机构端），只作页面样式参考；验收以后台管理与 C 端小程序的逐行功能清单为准。
- 原型预览：在该目录执行 `python3 -m http.server 8899 --bind 127.0.0.1`，打开 `http://127.0.0.1:8899/index.html`。

- 原型目录：`docs/天赋正式开发交接包/talent-prototype-v2/`（静态站，只作样式参考）。
