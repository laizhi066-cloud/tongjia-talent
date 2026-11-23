#!/usr/bin/env python3
"""统一 bump 原型资源版本号。

用法：python3 bump-version.py 1.22.0

同时更新 index.html 的入口资源与 assets/js/*.js 里所有静态 import 的 ?v=。
只改入口、不改子模块 import 会让浏览器继续用缓存里的旧脚本，导致
「代码改了、页面没变」——本脚本就是为防止这种情况。

配合 serve.py（返回 Cache-Control: no-store）使用，本地演示刷新即生效。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ver = sys.argv[1] if len(sys.argv) > 1 else ''
if not re.fullmatch(r'\d+\.\d+\.\d+', ver):
    sys.exit('用法: python3 bump-version.py 1.22.0')

# 已有 ?v= 的换成新版本；没有的补上
pat = re.compile(r"(from\s+'[^']+\.js)(\?[^']*)?(')")
count = 0
for p in sorted((ROOT / 'assets' / 'js').glob('*.js')):
    src = p.read_text(encoding='utf-8')

    def rep(m):
        global count
        count += 1
        return m.group(1) + '?v=' + ver + m.group(3)

    out = pat.sub(rep, src)
    if out != src:
        p.write_text(out, encoding='utf-8')
        print('updated', p.name)

idx = ROOT / 'index.html'
t = idx.read_text(encoding='utf-8')
out = re.sub(r'\?v=\d+\.\d+\.\d+', '?v=' + ver, t)
if out != t:
    idx.write_text(out, encoding='utf-8')
print(f'version -> {ver}; module imports: {count}; index.html refs: {out.count("?v=" + ver)}')
