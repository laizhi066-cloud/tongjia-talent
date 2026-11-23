---
trigger: always_on
description: 同佳天赋工程总纲：产品边界、红线、文档入口与本地命令
---

# 同佳天赋 · 项目规则

工程规则的唯一事实来源是仓库根的 `AGENTS.md`。**开始任务前先完整读取它**，本文件只保留红线与常用入口。

## 红线

1. 单实例、单 PocketBase：不加 `TENANT_MODE`、`site` cookie、`X-Site-Slug`，不按请求切换数据库。
2. 天赋业务字段只落 `talent_*` 集合，不回填 `users`、`configs`、`site_config`。
3. 不恢复 2026-09-24 已废弃的培训机构、课程、课表、计划课程与多计划共享。
4. `scripts/setup.mjs` 只能初始化空数据目录；发现旧业务集合必须失败，它不是迁移或清库工具。
5. 脏工作树里只改任务相关文件，不执行 `git reset --hard`、广泛 `rm -rf` 或未授权发布。

## 先读什么

| 场景 | 文档 |
| --- | --- |
| 确认分支、服务、已知缺口 | `docs/STATUS.md` |
| 写代码前的硬性规则 | `docs/CONVENTIONS.md` |
| 新功能落点与数据闭环 | `docs/DEVELOPMENT.md` |
| 接口一览 | `docs/API.md` |
| 提交 / 发布前验证 | `docs/QUALITY.md` |

## 本地命令

```bash
pnpm pb        # PocketBase，127.0.0.1:8090
pnpm dev       # Nuxt B 端与 API，127.0.0.1:3000
pnpm typecheck && pnpm lint && pnpm test
```

本地地址一律用 `127.0.0.1`，不要用 `localhost`。

## 工程速览

- Nuxt 4 + Vue 3 + Nitro + Naive UI + PocketBase（SQLite）；C 端 uni-app + Wot UI。
- 服务端写接口：`validateBody()` + 权限校验 + `withOperLog()`，成功响应 `success()`。
- 新增集合或字段同步 `shared/types/` 与 `scripts/setup.mjs`；新增 B 端 API 同步补 composable。
- 中文沟通；代码、命令、路径、配置键保留原文。

## 商务与验收依据

`docs/天赋正式开发交接包/` 放天赋专项的报价单、逐行功能清单、流程图与可运行原型，是验收口径的依据。

- 两端合计 48,000 元：后台管理 36,000 + C 端小程序 12,000，以 `同佳天赋专项报价单.xlsx` 为准。
- 原型为 2026-09 四端旧口径（含机构端），只作页面样式参考；验收以后台管理与 C 端小程序的逐行功能清单为准。
- 原型预览：在该目录执行 `python3 -m http.server 8899 --bind 127.0.0.1`，打开 `http://127.0.0.1:8899/index.html`。

- 原型目录：`docs/天赋正式开发交接包/talent-prototype-v2/`（静态站，只作样式参考）。
