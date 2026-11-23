# -*- coding: utf-8 -*-
"""从《同佳天赋专项报价单.xlsx》导出原型数据源。

用法：python3 tools/export-quote-data.py
输出：../assets/js/quote-data.js

报价单调整后重跑本脚本，原型菜单与功能点验收清单会自动同步。
"""
import json
from pathlib import Path

import openpyxl

BASE = Path(__file__).resolve().parent.parent
QUOTE = BASE.parent / "同佳天赋专项报价单.xlsx"
OUT = BASE / "assets" / "js" / "quote-data.js"

# 二级模块 -> 一级菜单（后台）/ tab（小程序）
ADMIN_GROUP = {
    "工作台与待办": "工作台",
    "会员管理": "会员管理",
    "培养方向管理": "培养方向",
    "天赋规则｜分类与要素": "天赋规则",
    "天赋规则｜分级与固定注解": "天赋规则",
    "天赋规则｜资料导入": "天赋规则",
    "报告管理": "报告管理",
    "系统设置": "系统设置",
}
MINI_GROUP = {
    "登录与孩子关系": "我的",
    "首页": "首页",
    "我的报告": "报告",
    "培养方向与目标档位": "报告",
    "我的": "我的",
}


def read_modules(ws):
    blocks = []
    for merged in ws.merged_cells.ranges:
        if not str(merged).startswith("B"):
            continue
        start, end = merged.min_row, merged.max_row
        name = ws.cell(row=start, column=2).value
        features = [
            [ws.cell(row=r, column=3).value, ws.cell(row=r, column=4).value]
            for r in range(start, end + 1)
        ]
        blocks.append((start, {"name": name, "features": features}))
    return [item for _, item in sorted(blocks, key=lambda x: x[0])]


def read_flow(ws):
    keys = ["no", "phase", "step", "actor", "input", "output", "admin", "mini", "check"]
    return [
        {k: ws.cell(row=r, column=i + 1).value for i, k in enumerate(keys)}
        for r in range(5, ws.max_row + 1)
    ]


def main():
    wb = openpyxl.load_workbook(QUOTE, data_only=True)
    admin = read_modules(wb["后台管理"])
    mini = read_modules(wb["C 端小程序"])
    flow = read_flow(wb["业务闭环"])

    for m in admin:
        m["group"] = ADMIN_GROUP[m["name"]]
    for m in mini:
        m["group"] = MINI_GROUP[m["name"]]

    a_points = sum(len(m["features"]) for m in admin)
    m_points = sum(len(m["features"]) for m in mini)
    meta = {
        "total": 48000, "adminAmount": 36000, "miniAmount": 12000,
        "days": 40, "rate": 1200,
        "adminPoints": a_points, "miniPoints": m_points,
        "totalPoints": a_points + m_points,
    }

    def js(value):
        return json.dumps(value, ensure_ascii=False, indent=2)

    lines = [
        "/* 由《同佳天赋专项报价单.xlsx》自动导出，请勿手工编辑。",
        f"   来源：后台管理 {a_points} 项 + C 端小程序 {m_points} 项 + 业务闭环 {len(flow)} 环节。",
        "   重新生成：python3 tools/export-quote-data.py */",
        "",
        "export const META = " + js(meta) + ";",
        "",
        "export const ADMIN_MODULES = " + js(admin) + ";",
        "",
        "export const MINI_MODULES = " + js(mini) + ";",
        "",
        "export const FLOW = " + js(flow) + ";",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"written {OUT}")
    print(f"后台 {len(admin)} 模块 / {a_points} 项，C 端 {len(mini)} 模块 / {m_points} 项，流程 {len(flow)} 环节")


if __name__ == "__main__":
    main()
