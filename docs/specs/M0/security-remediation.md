# M0 · 密钥止血与仓库卫生

> 状态：待执行（人工）。这是所有 agent 开工的前置条件。本文只写命令，不记录任何真实密钥。

## 事实

以下文件已被 Git 跟踪，且包含明文凭据：

- `.env`
- `.deploy.env`
- `cc-connect-config.toml`（含明文模型 API key，看起来是另一个项目的连接配置）

`docs/STATUS.md` §7 已把 `.env` / `.deploy.env` 列为 P0；本次盘点新增 `cc-connect-config.toml`。

## 处置顺序

### 1. 先轮换，再清理历史

先在所有相关平台轮换密钥，避免清理期间旧 key 仍可用：

- OSS AccessKey ID / Secret
- 服务器 SSH 口令 / 密钥
- PocketBase 超管账号口令
- 微信 AppSecret
- `.env` 中的其他 token
- `cc-connect-config.toml` 中的模型 API key
- 百炼 token-plan key（如曾出现在任何被跟踪文件/截图）

### 2. 停止跟踪（保留本地文件）

```bash
git rm --cached .env .deploy.env cc-connect-config.toml
```

把这三项加入 `.gitignore`（如果尚未覆盖）。`cc-connect-config.toml` 建议移到仓库外（如 `~/.config/cc-connect/`），用环境变量注入 key。

### 3. 清理历史（仅在确认已推送过时）

先确认：

```bash
git log --all --oneline -- .env .deploy.env cc-connect-config.toml
```

如历史中已有这些文件，使用 `git filter-repo` 或 BFG 清理，并通知所有协作者重新克隆；清理后再次轮换密钥。不要在未备份的情况下重写历史。

### 4. 验证

```bash
git ls-files | grep -E '^\.env$|^\.deploy\.env$|cc-connect-config\.toml' || echo "OK: 已不在索引"
git status --short
```

确认工作树中的本地文件仍存在、应用仍可启动，但 `git status` 不再显示它们为待提交。

## 后续规则

- 新密钥只进环境变量或 `~/.dsh/.credentials.yaml` / 部署平台密钥管理，不进仓库。
- 文档、测试、截图、会话记录不出现真实密钥。
- agent 读取仓库前先确认本项完成；未完成时禁止把 `.env` 内容贴进对话。