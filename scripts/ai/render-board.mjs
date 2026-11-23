#!/usr/bin/env node
/**
 * 把工作区看板 .dsh-kanban.json 渲染成可直接用浏览器打开的只读 HTML。
 * 用法：node scripts/ai/render-board.mjs
 * 输出：docs/ai-workbench/board.html（自包含，无外部依赖）
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const boardPath = resolve(root, ".dsh-kanban.json");
const outPath = resolve(root, "docs/ai-workbench/board.html");

const board = JSON.parse(readFileSync(boardPath, "utf8"));
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const priorityLabel = { high: "P0/P1", medium: "P2", low: "P3" };
const priorityClass = { high: "high", medium: "medium", low: "low" };
const labelColors = new Map((board.labels || []).map((label) => [label.name, label.color]));
const columns = Array.isArray(board.columns) ? board.columns : [];
const cards = Array.isArray(board.cards) ? board.cards : [];
const byColumn = new Map(columns.map((column) => [column.id, []]));
for (const card of cards) {
  if (byColumn.has(card.columnId)) byColumn.get(card.columnId).push(card);
}

const renderCard = (card) => {
  const label = card.label
    ? `<span class="tag" style="--tag-color:${escapeHtml(labelColors.get(card.label) || "#64748b")}">${escapeHtml(card.label)}</span>`
    : "";
  const priority = card.priority
    ? `<span class="priority ${priorityClass[card.priority] || ""}">${escapeHtml(priorityLabel[card.priority] || card.priority)}</span>`
    : "";
  const due = card.dueDate ? `<span class="due">截止 ${escapeHtml(card.dueDate)}</span>` : "";
  const completed = card.completedAt ? `<span class="done-at">完成</span>` : "";
  const note = card.note
    ? `<pre class="note">${escapeHtml(card.note)}</pre>`
    : "";
  return `<article class="card ${card.completedAt ? "is-done" : ""}">
    <header class="card-head"><span class="card-id">${escapeHtml(card.id)}</span>${label}${priority}</header>
    <h3>${escapeHtml(card.title)}</h3>
    ${note}
    <footer class="card-foot">${due}${completed}</footer>
  </article>`;
};

const columnsHtml = columns
  .map((column) => {
    const list = byColumn.get(column.id) || [];
    return `<section class="column">
      <header class="column-head"><h2>${escapeHtml(column.title)}</h2><span>${list.length}</span></header>
      <div class="cards">${list.map(renderCard).join("") || '<p class="empty">暂无卡片</p>'}</div>
    </section>`;
  })
  .join("");

const doneCount = cards.filter((card) => card.columnId === board.completedColumnId).length;
const generatedAt = new Date().toLocaleString("zh-CN", { hour12: false });

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>同佳天赋 · AI 研发工作台</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f7fb; --panel:#fff; --line:#e5e7eb; --text:#111827; --muted:#6b7280; --accent:#6d28d9; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f1117; --panel:#171a22; --line:#2a2f3a; --text:#e5e7eb; --muted:#9ca3af; --accent:#a78bfa; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
  a { color:var(--accent); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width:1500px; margin:0 auto; padding:28px 20px 48px; }
  .top { display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; justify-content:space-between; margin-bottom:18px; }
  h1 { margin:0; font-size:26px; letter-spacing:-.02em; }
  .sub { margin:6px 0 0; color:var(--muted); font-size:13px; }
  .stats { display:flex; gap:10px; flex-wrap:wrap; }
  .stat { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:10px 14px; min-width:110px; }
  .stat b { display:block; font-size:20px; }
  .stat span { color:var(--muted); font-size:12px; }
  .links { display:flex; flex-wrap:wrap; gap:8px 16px; padding:14px 16px; margin:18px 0 22px; background:var(--panel); border:1px solid var(--line); border-radius:12px; font-size:13px; }
  .board { display:grid; grid-template-columns:repeat(5,minmax(240px,1fr)); gap:14px; align-items:start; overflow-x:auto; padding-bottom:4px; }
  .column { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:12px; min-height:160px; }
  .column-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .column-head h2 { margin:0; font-size:14px; }
  .column-head span { color:var(--muted); font-size:12px; }
  .cards { display:flex; flex-direction:column; gap:10px; }
  .card { border:1px solid var(--line); border-radius:12px; padding:12px; background:color-mix(in srgb, var(--panel) 88%, var(--bg)); }
  .card.is-done { opacity:.72; }
  .card-head { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:8px; }
  .card-id { color:var(--muted); font:12px ui-monospace,SFMono-Regular,Menlo,monospace; }
  h3 { margin:0 0 8px; font-size:14px; line-height:1.45; }
  .tag { border:1px solid var(--tag-color); color:var(--tag-color); border-radius:999px; padding:1px 8px; font-size:11px; }
  .priority { border-radius:999px; padding:1px 8px; font-size:11px; background:var(--bg); color:var(--muted); }
  .priority.high { color:#dc2626; }
  .priority.medium { color:#d97706; }
  .note { margin:0 0 8px; max-height:150px; overflow:auto; white-space:pre-wrap; word-break:break-word; color:var(--muted); font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  .card-foot { display:flex; gap:10px; flex-wrap:wrap; color:var(--muted); font-size:11px; }
  .done-at { color:#16a34a; }
  .empty { color:var(--muted); font-size:12px; margin:4px 0; }
  footer.page { margin-top:26px; color:var(--muted); font-size:12px; }
  @media (max-width:1100px) { .board { grid-template-columns:repeat(5,280px); } }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div>
      <h1>同佳天赋 · AI 研发工作台</h1>
      <p class="sub">只读看板快照 · 数据源 <a href="../../.dsh-kanban.json">.dsh-kanban.json</a> · 生成于 ${escapeHtml(generatedAt)}</p>
    </div>
    <div class="stats">
      <div class="stat"><b>${cards.length}</b><span>全部卡片</span></div>
      <div class="stat"><b>${doneCount}</b><span>已完成</span></div>
      <div class="stat"><b>${cards.length - doneCount}</b><span>未完成</span></div>
    </div>
  </header>

  <nav class="links">
    <a href="../specs/M1-rules/spec.md">M1 规则域规格</a>
    <a href="../specs/M1-rules/acceptance.md">M1 验收与证据</a>
    <a href="../adr/0001-m1-rule-domain.md">ADR 0001</a>
    <a href="README.md">工作台说明</a>
    <a href="../specs/M0/security-remediation.md">P0 密钥止血</a>
    <a href="../API.md">API 索引</a>
    <a href="../ARCHITECTURE.md">架构</a>
    <a href="../STATUS.md">当前状态</a>
  </nav>

  <main class="board">${columnsHtml}</main>

  <footer class="page">只读快照；修改卡请回到 DSH 侧栏「看板」。重新生成：<code>node scripts/ai/render-board.mjs</code>。</footer>
</div>
</body>
</html>`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(`rendered ${outPath} (${cards.length} cards, ${doneCount} done)`);