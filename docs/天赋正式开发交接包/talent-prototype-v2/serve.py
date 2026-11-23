#!/usr/bin/env python3
"""本地演示服务：静态托管原型并禁用缓存。

用法：python3 serve.py 8901
浏览器对 python -m http.server 的 JS 会做启发式缓存，原型改了脚本却仍加载旧副本；
这里统一返回 no-store，改动后刷新页面即可看到最新版本。
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8901


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    handler = partial(NoCacheHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    print(f'Serving {ROOT} at http://127.0.0.1:{PORT}/', flush=True)
    server.serve_forever()
