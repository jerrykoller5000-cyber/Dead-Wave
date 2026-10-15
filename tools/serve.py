# tools/serve.py - the local server behind "Play Dead-Wave.bat" (Claude, 2026-09-29).
#
# Why not plain `python -m http.server`: it sends no Cache-Control, so the browser keeps its
# own copy of every module (ui/strings.js, core/*.js, ...) and reuses it without asking. When
# the crew updates index.html and a module together, the game gets the new index.html with an
# old module; a missing text key (cif.title, 2026-09-29) threw at start-up and the loading
# screen stopped at "terrain". This server says "no-store", so every start loads what is on disk.
# It also names the JavaScript types itself: Windows can map .js to text/plain in the registry,
# and a module served as text/plain does not load at all.
import glob
import http.server
import json
import os
import re
import socket
import sys
import tempfile
import time
import uuid
from urllib.parse import parse_qs, urlsplit

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = ('.mp3', '.wav', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.flac', '.webm')


def game_backed_html(pathname):
    return (
        pathname == '/index.html'
        or re.match(r'^/tools/tests/test(?:-\d+)?\.html$', pathname, re.I)
        or re.match(r'^/studio/(?:inspector|motion(?:-lab)?)/.*\.html$', pathname, re.I)
    )


def active_game_test_token(token):
    if not token:
        return False
    machine = re.sub(r'[^a-zA-Z0-9_.-]+', '-', socket.gethostname() or 'unknown-computer')
    pattern = os.path.join(tempfile.gettempdir(), 'dead-wave-game-test-slot-*-' + machine)
    for folder in glob.glob(pattern):
        lock_path = os.path.join(folder, 'state.lock')
        lock_token = str(uuid.uuid4())
        try:
            lock_fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            continue
        try:
            owner = json.dumps({
                'pid': os.getpid(),
                'token': lock_token,
                'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }).encode('utf-8')
            os.write(lock_fd, owner)
            os.fsync(lock_fd)
            state = None
            for name in ('state.json', 'state.backup.json'):
                try:
                    with open(os.path.join(folder, name), encoding='utf-8') as source:
                        state = json.load(source)
                    break
                except (OSError, ValueError):
                    pass
            if state and state.get('computer') == socket.gethostname():
                holder = state.get('holder') or {}
                if holder.get('token') == token:
                    return True
        finally:
            try:
                os.close(lock_fd)
                with open(lock_path, encoding='utf-8') as source:
                    current = json.load(source)
                if current.get('pid') == os.getpid() and current.get('token') == lock_token:
                    os.unlink(lock_path)
            except (OSError, ValueError):
                pass
    return False


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
        request = urlsplit(self.path)
        if game_backed_html(request.path):
            token = (parse_qs(request.query).get('__gameTestToken') or [None])[0]
            if not active_game_test_token(token):
                self.send_error(423, 'Game page requires the active machine-wide game-test lease')
                return
        if request.path == '/__zsounds':
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

    # CL-192: the opening's own timing record (assets/intro/opening-perf.js) is posted here once the menu has been up a
    # few seconds, and lands in qa/perf/opening-<time>.json for the crew to read. JSON only, at most 2 MB, a fixed folder.
    def do_POST(self):
        if self.path.split('?')[0] != '/__perflog':
            self.send_error(404)
            return
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > 2_000_000:
            self.send_error(413)
            return
        body = self.rfile.read(n)
        try:
            json.loads(body.decode('utf-8'))
        except Exception:
            self.send_error(400)
            return
        folder = os.path.join(ROOT, 'qa', 'perf')
        os.makedirs(folder, exist_ok=True)
        name = 'opening-' + time.strftime('%Y%m%d-%H%M%S') + '.json'
        with open(os.path.join(folder, name), 'wb') as f:
            f.write(body)
        self.send_response(204)
        self.end_headers()

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
