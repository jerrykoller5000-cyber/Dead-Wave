# tools/serve.py - the local server behind "Play Dead-Wave.bat" (Claude, 2026-09-29).
#
# Why not plain `python -m http.server`: it sends no Cache-Control, so the browser keeps its
# own copy of every module (ui/strings.js, core/*.js, ...) and reuses it without asking. When
# the crew updates index.html and a module together, the game gets the new index.html with an
# old module; a missing text key (cif.title, 2026-09-29) threw at start-up and the loading
# screen stopped at "terrain". This server says "no-store", so every start loads what is on disk.
# It also names the JavaScript types itself: Windows can map .js to text/plain in the registry,
# and a module served as text/plain does not load at all.
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
        '.glb': 'model/gltf-binary',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # quiet: the window is minimised anyway


if __name__ == '__main__':
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as httpd:
        print('Dead-Wave on http://127.0.0.1:%d/ (no-store)' % PORT)
        httpd.serve_forever()
