# 5 分钟快速开始

本指南从一个空的本地 PocketBase 数据目录启动 Foundation。它不会迁移旧项目、清除旧 `pb_data/`，也不会载入行业演示数据。

## 1. 前置条件

| 项目 | 要求 | 检查方式 |
| --- | --- | --- |
| Node.js | `>=20.19.0` | `node -v` |
| pnpm | `>=10` | `pnpm -v` |
| PocketBase | `0.38.1`，放 `pocketbase/pocketbase` | `pnpm env:doctor` |
| Playwright 浏览器 | 仅运行 `pnpm e2e` 时需要 | `pnpm exec playwright install chromium` |
| 网络端口 | 本地默认使用 `3000`（Nuxt）和 `8090`（PocketBase） | 确认端口未被其他服务占用 |

**仓库不包含 PocketBase 二进制**（`pocketbase/` 在 `.gitignore` 中），首次运行前需自行下载并与生产保持同一版本：

```bash
# macOS arm64 示例，其他平台替换 release 文件名
curl -L -o /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.38.1/pocketbase_0.38.1_darwin_arm64.zip
unzip -o /tmp/pb.zip -d /tmp/pb
mkdir -p pocketbase && cp /tmp/pb/pocketbase pocketbase/pocketbase && chmod +x pocketbase/pocketbase
```

内网无法直连 GitHub 时可用 `https://gh-proxy.com/https://github.com/...` 之类的镜像前缀，下载后仍应校验 `./pocketbase/pocketbase --version` 为 `0.38.1`。

Windows 上二进制可以是 `pocketbase/pocketbase.exe`；如放在其他位置，在 `.env` 设置 `POCKETBASE_BINARY` 为绝对路径。不要手动调用 `pocketbase serve`：`pnpm pb` 会用空迁移目录和 `--automigrate=false` 启动，避免历史迁移影响基础库。默认目录中的 `.gitkeep` 只用于 Git 保留空目录，会被忽略；若显式设置 `POCKETBASE_MIGRATIONS_DIR`，除该占位文件外必须为空，脚本会拒绝真实迁移文件且绝不会删除其中内容。

## 2. 安装与环境文件

在仓库根目录执行：

```bash
pnpm install
pnpm fonts:fetch   # PDF 中文字体约 16MB，不入库，首次运行需下载
cp .env.example .env
```

打开 `.env` 后至少替换下列本地密钥：

| 变量 | 用途 | 本地建议 |
| --- | --- | --- |
| `POCKETBASE_ADMIN_EMAIL` | PocketBase 超管及初始化后台账户邮箱 | 使用仅本机使用的邮箱 |
| `POCKETBASE_ADMIN_PASSWORD` | PocketBase 超管及初始化后台账户密码 | 至少 8 位；真实环境使用独立强密码 |
| `ENCRYPTION_KEY` | 加密微信 AppSecret 等敏感配置 | 使用至少 32 位随机字符串，例如 `openssl rand -hex 32` |

报告 PDF 有两条来源：第三方回传可带 `pdfUrl`（只由服务端代理访问，不下发原始地址）；没有带文件时，由管理端「报告列表 → 上传 PDF」手动补充。报告 PDF 默认保存到当前 PocketBase 的私有用途文件；需要改用阿里云 OSS 时，在服务端 `.env` 设置 `OSS_ENABLED=true`，并填写 `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`。OSS bucket 必须保持私有，浏览器不会拿到对象直链；密钥不要写入 `apps/client/env/` 或提交到 Git。

示例文件内的凭据只用于本机冷启动，不能用于可被他人访问的环境，`.env` 也不能提交到 Git。

运行只读环境检查：

```bash
pnpm env:doctor
```

它应输出 PocketBase 二进制路径、数据目录和唯一 PocketBase 地址。默认值分别是仓库内的 `pocketbase/pocketbase`、`pb_data/` 和 `http://127.0.0.1:8090`。

## 3. 初始化新库

```bash
pnpm env:setup
```

初始化会临时启动 PocketBase，创建基础 schema、`superadmin` 角色、基础菜单、站点配置和使用 `.env` 凭据的后台账户，然后停止临时进程。

如果提示检测到旧业务集合，说明目标数据目录不是新库。**不要**删除、迁移或复用它；在 `.env` 写入新的绝对路径后重试：

```dotenv
POCKETBASE_DATA_DIR=/absolute/path/to/foundation-pb-data
```

`pnpm env:setup` 与之后的 `pnpm pb` 必须读取同一份 `.env`，才能使用同一个新库。`scripts/setup.mjs` 不是升级脚本，不适用于已有基础库或生产库。

## 4. 启动并登录 B 端

打开两个终端：

```bash
# 终端 1：唯一 PocketBase，保持前台运行
pnpm pb

# 终端 2：Nuxt B 端与 Nitro API
pnpm dev
```

访问 [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login)，使用 `.env` 的 `POCKETBASE_ADMIN_EMAIL` 和 `POCKETBASE_ADMIN_PASSWORD` 登录。登录框支持**账号名或邮箱**。

可以用 `pnpm accounts:seed` 生成两个预置账号（可重复执行）：

| 账号 | 密码 | 角色 | 用途 |
| --- | --- | --- | --- |
| `superAdmin` | `laizhi066` | 超级管理员 | 开发 / 运维，拥有全部菜单与接口权限，不对客户开放 |
| `admin` | `admin123` | 客户管理员 | 交付客户，仅天赋业务，系统 / 监控 / 日志不可见 |

两个默认口令在生产必须用 `SUPERADMIN_PASSWORD` / `CUSTOMER_ADMIN_PASSWORD` 覆盖；客户管理员当前侧边栏仍会出现「系统管理 > 机构管理」，与设计意图不符，已登记在 [STATUS.md](STATUS.md#7-已知未闭环按优先级)。

首次进入“平台会员”后建议完成以下最小配置：

1. 在“系统管理 > 站点配置”填写名称、Logo、主色和门户默认外观；这些公开值会同步给 C 端。
2. 在“系统管理 > 微信配置”填写微信小程序凭据；AppSecret 会以 `ENCRYPTION_KEY` 加密保存。
3. 在“系统管理 > 用户 / 角色 / 菜单”创建实际管理员及最小权限；不要日常使用初始化超管。
4. 需要本地天赋演示数据时，按 [天赋系统本地闭环](TALENT-LOCAL.md) 执行 `TALENT_SEED_CONFIRM=mock pnpm talent:seed`（会清空天赋业务数据，仅限本地）。

若 B 端无法连接，请先确认 `pnpm pb` 的地址与 `.env` 中 `POCKETBASE_URL` 一致，并始终访问 `127.0.0.1` 而不是 `localhost`。

## 5. 启动 C 端

Nuxt 与 PocketBase 仍需保持运行。另开终端按目标端执行：

```bash
# 微信小程序开发构建
pnpm client:dev

# H5 开发构建
pnpm --filter foundation-portal dev:h5
```

开发模式中 `apps/client/env/.env.development` 已将 `VITE_SERVER_BASEURL` 设为 `http://127.0.0.1:3000`。H5 的实际访问地址以命令输出为准；小程序构建产物由微信开发者工具打开。微信登录本身需要对应平台 AppID、AppSecret、授权回调和域名白名单，未配置时门户会保留清晰的不可用提示。

## 6. 验证最小闭环

完成启动后，按以下顺序确认：

- B 端能登录，并能打开“平台会员”“天赋规则 > 分类与要素”和“系统管理 > 站点配置”。
- C 端首页能读取 B 端保存的站点名称、Logo、主色和默认外观。
- C 端“我的”能进入资料、隐私、协议和关于页面；未配置微信时认证入口给出明确提示。
- B 端“运行监控 > 系统健康”中数据库连接和必填环境变量状态正常。
- 需要天赋业务闭环验证时，按 [TALENT-LOCAL.md](TALENT-LOCAL.md) 的验收顺序逐项执行。

提交或交付前的完整质量门禁见 [QUALITY.md](QUALITY.md)。C 端接口地址、微信配置和生产变量见 [CLIENT-PORTAL.md](CLIENT-PORTAL.md#环境配置) 与 [DEPLOYMENT.md](DEPLOYMENT.md)。
