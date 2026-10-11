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
import json
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = ('.mp3', '.wav', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.flac', '.webm')


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
        '.glb': 'model/gltf-binary',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # CL-148: /__zsounds lists the audio files under z-sounds/ (Jerry's recorded zombie takes, core/takes.js), so the
    # game finds what he has dropped in without anything to run. Paths are relative to z-sounds/, with / separators.
    def do_GET(self):
        if self.path.split('?')[0] == '/__zsounds':
            base = os.path.join(ROOT, 'z-sounds')
            files = []
            for d, _dirs, names in os.walk(base):
                for n in names:
                    if n.lower().endswith(AUDIO) and not n.startswith(('.', '_')):
                        files.append(os.path.relpath(os.path.join(d, n), base).replace(os.sep, '/'))
            body = json.dumps({'root': 'z-sounds', 'files': sorted(files)}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # quiet: the window is minimised anyway


if __name__ == '__main__':
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as httpd:
        print('Grave Shift on http://127.0.0.1:%d/ (no-store)' % PORT)
        httpd.serve_forever()
