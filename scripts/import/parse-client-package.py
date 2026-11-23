#!/usr/bin/env python3
"""解析客户真实报告包：6 份 Word（A-F）+ 建议库 xlsx -> 规范化 JSON。

用法:
  python3 scripts/import/parse-client-package.py <报告目录> <建议库.xlsx> [输出.json]

不写数据库；输出含姓名/生日等 PII，只应保存在隔离临时目录，不提交仓库。
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path
from docx import Document
from openpyxl import load_workbook

LEVEL_MAP = {
    "卓越级": "LV4", "卓越": "LV4",
    "优秀级": "LV3", "优秀": "LV3",
    "优良级": "LV2", "优良": "LV2",
    "常态级": "LV1", "常态": "LV1",
    "弱势级": "LV2", "弱势": "LV2", "弱态": "LV2",
}
BOOK_NAMES = {"A": "生长发育", "B": "智商", "C": "情商", "D": "领导商", "E": "艺术商", "F": "体育运动商"}

def norm_factor(value: str) -> str:
    return re.sub(r"[\s·•\-—（）()]+", "", str(value or "")).strip()

def parse_meta(paragraphs: list[str]) -> dict:
    text = "\n".join(paragraphs[:120])
    meta = {}
    m = re.search(r"本人姓名\s*[:：]?\s*(\S+)\s+性别\s*[:：]?\s*(\S+)\s+出生日期\s*[:：]?\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日", text)
    if m:
        meta["name"], meta["genderText"] = m.group(1), m.group(2)
        meta["birthday"] = f"{int(m.group(3)):04d}-{int(m.group(4)):02d}-{int(m.group(5)):02d}"
    m = re.search(r"本人报告ID\s*[:：]?\s*(\S+)", text)
    if m: meta["reportId"] = m.group(1)
    m = re.search(r"家长\s*[:：]?\s*姓名\s*(\S+)\s*与本人关系\s*(\S+)", text)
    if m: meta["parentName"], meta["relation"] = m.group(1), m.group(2)
    m = re.search(r"联系电话\s*(\d{6,})", text)
    if m: meta["mobile"] = m.group(1)
    m = re.search(r"建档日期\s*[:：]?\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日", text)
    if m: meta["filedAt"] = f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    meta["gender"] = "female" if str(meta.get("genderText", "")).startswith("女") else "male"
    return meta


def extract_factor_notes(paragraphs: list[str]) -> dict[str, str]:
    notes: dict[str, str] = {}
    current = ""
    for line in paragraphs:
        match = re.match(r"^\s*(?:\d+、|[一二三四五六七八九十]+、)?【(.+?)】\s*$", line)
        if match:
            current = norm_factor(match.group(1))
            continue
        if current and "潜质表型要点" in line:
            text = line.split("：", 1)[-1].strip()
            if text:
                notes[current] = text
    return notes

def parse_report(path: Path) -> dict:
    match = re.search(r"报告([A-F])篇", path.stem)
    book = match.group(1) if match else ""
    doc = Document(path)
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    notes = extract_factor_notes(paragraphs)
    factors = []
    seen = set()
    for table in doc.tables:
        rows = [[c.text.strip().replace("\n", " ") for c in row.cells] for row in table.rows]
        if not rows: continue
        header_index = next((i for i, row in enumerate(rows) if any("天赋潜质" in c for c in row)), None)
        if header_index is None: continue
        for row in rows[header_index + 1:]:
            if len(row) < 3 or not row[1]: continue
            name = row[1].strip()
            entropy = row[2].strip()
            if not entropy.endswith("级") and entropy not in ("卓越", "优秀", "优良", "常态", "弱势", "弱态"):
                continue
            key = (name, entropy)
            if key in seen: continue
            seen.add(key)
            factors.append({
                "sequence": row[0].strip(),
                "name": name,
                "factorKey": norm_factor(name),
                "entropy": entropy.replace("级", ""),
                "levelCode": LEVEL_MAP.get(entropy, ""),
                "position": row[3].strip() if len(row) > 3 else "",
                "note": notes.get(norm_factor(name), ""),
            })
    return {"book": book, "bookName": BOOK_NAMES.get(book, ""), "file": path.name, "meta": parse_meta(paragraphs), "factors": factors}

def parse_advice(path: Path) -> list[dict]:
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb["Sheet1"]
    factor = level = book = None
    groups: dict[tuple[str, str], list[dict]] = {}
    for row in ws.iter_rows(min_row=3, values_only=True):
        if row[2]: book = str(row[2]).strip()
        if row[3]: factor = str(row[3]).strip()
        if row[4]: level = str(row[4]).strip()
        texts = [str(x).strip() if x is not None else "" for x in row[5:9]]
        if not factor or not level or not any(texts): continue
        key = (norm_factor(factor), level)
        groups.setdefault(key, []).append({
            "factor": factor,
            "factorKey": norm_factor(factor),
            "entropy": level.replace("级", ""),
            "book": book or "",
            "content": texts[0], "example": texts[1], "direction": texts[2], "suggestion": texts[3],
        })
    result = []
    for (factor_key, level), rows in groups.items():
        for index, row in enumerate(rows, start=1):
            row["variant"] = index
            result.append(row)
    return result

def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__); return 2
    report_dir, advice_path = Path(sys.argv[1]), Path(sys.argv[2])
    output = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("/tmp/client-import/package.json")
    reports = [parse_report(p) for p in sorted(report_dir.glob("*.docx"))]
    reports = [r for r in reports if r["book"]]
    meta = next((r["meta"] for r in reports if r["meta"]), {})
    payload = {
        "generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "subject": meta,
        "reports": reports,
        "advice": parse_advice(advice_path),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "books": [r["book"] for r in reports],
        "factorCounts": {r["book"]: len(r["factors"]) for r in reports},
        "factorTotal": sum(len(r["factors"]) for r in reports),
        "adviceRows": len(payload["advice"]),
        "adviceFactors": len({a["factorKey"] for a in payload["advice"]}),
    }, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
