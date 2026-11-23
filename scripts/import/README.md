# 客户真实报告包导入

> 开发/运维工具；用于把客户发来的 6 份 Word 报告 + 建议库 xlsx 导入本地/测试库。不会写入 git，PII 只落临时目录。

## 1. 准备

```bash
# 依赖：Python 3 + python-docx + openpyxl（DSH 运行时的 Python 已带）
python3 --version
```

输入目录约定：

```text
报告目录/
  xxx报告A篇.docx ... xxx报告F篇.docx   # 文件名需含「报告A篇」…「报告F篇」
建议库.xlsx                             # Sheet1：序号/年龄/分册/潜质要素/数据熵/分级内容/分级举例/培育方向/培育建议
```

## 2. 解析

```bash
python3 scripts/import/parse-client-package.py <报告目录> <建议库.xlsx> /tmp/client-import/package.json
```

输出计数：6 册、156 因子、建议行数；不连库。

## 3. 转换原版 PDF（可选，推荐）

用交付环境已有的 Office 转换能力把 6 份 docx 转为 PDF，命名为 `A.pdf`…`F.pdf` 放到 `/tmp/client-import/pdf/`。
（当前 import 脚本按 `<pdf-dir>/<A-F>.pdf` 读取；无原版 PDF 时 C 端退回 M8 生成版。）

## 4. 导入

```bash
# dry-run：只做因子映射，不写库
node scripts/import/import-client-package.mjs /tmp/client-import/package.json

# 写库（本地演示/测试库）；默认读取 /tmp/client-import/pdf
node scripts/import/import-client-package.mjs /tmp/client-import/package.json --apply --pdf-dir /tmp/client-import/pdf
```

行为：

- 按 M1 分册内序号映射 `A-01…F-21`，名称不再作为匹配依据；输出未匹配项并阻止静默丢数据。
- 更新演示家长/孩子展示字段（保留加密手机号/身份证真源），不重建账号。
- `talent_gene_reports` / `talent_reports` 按 `subjectType+subjectId` 幂等 upsert，再走 M3 发布接口冻结快照。
- 原版 PDF 写入 `talent_report_source_pdfs`；C 端 `/pdf` 优先返回原版，未导入时回退生成版。
- 建议库按「潜质要素 + 数据熵 + 变体」写入 `talent_advice_docs`；当前 active 版本，重复执行 PATCH 更新。
- 需要非本机库时加 `--allow-remote`；脚本不读取真实 `.env` 内容，只通过 `scripts/_pb.mjs` 使用配置。

## 5. 已知数据缺口

当前客户建议库只填充了 **3 个要素 × 4 档 × 3 变体**（27 行有正文）；其余要素无建议正文。导入后 C 端只显示有内容的建议书分册；完整库到位后重跑脚本即可补全。
