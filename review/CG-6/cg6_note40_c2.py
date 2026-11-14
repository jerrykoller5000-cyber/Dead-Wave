# CG-6 J153 note 40, Jerry's pick C2 (D-183): neutral hemisphere everywhere, indoor fill in Training while lit,
# picture grade default 1.05/1.15. Read-modify-write, keeps CRLF, refuses on any mismatch.
import sys, hashlib
p = sys.argv[1]; expect = sys.argv[2] if len(sys.argv) > 2 else None
b = open(p, 'rb').read()
if expect and hashlib.md5(b).hexdigest() != expect: sys.exit('md5 mismatch: ' + hashlib.md5(b).hexdigest())
s = b.decode('utf-8')
R = [
 ("    const hemi = new THREE.HemisphereLight(0xddeeff, 0x445566, 1.1);\r\n",
  "    const hemi = new THREE.HemisphereLight(0xf3f1ea, 0x8c877c, 1.1);   // CG-6 J153 40 (D-183, C2): neutral sky/ground, no blue-grey cast\r\n"),
 ("        hemi.intensity = 0.18 + visualFactor * 0.5;\r\n        moon.intensity = 0.05;\r\n",
  "        hemi.intensity = 0.18 + visualFactor * 0.5;\r\n        if (training.active && !training.lightsOff) hemi.intensity = Math.max(hemi.intensity, 1.15);   // CG-6 J153 40 (C2): the room's lights as an indoor fill\r\n        moon.intensity = 0.05;\r\n"),
 ("      brightness = 1; vibrancy = 1;\r\n      try {\r\n        const b = localStorage.getItem('tt_brightness');\r\n        const v = localStorage.getItem('tt_vibrancy');\r\n        const bb = b == null ? 1 : snapPicture(b, BRIGHT_MIN, BRIGHT_MAX, 0.05);\r\n        const vv = v == null ? 1 : snapPicture(v, VIBRANT_MIN, VIBRANT_MAX, 0.05);\r\n",
  "      brightness = 1.05; vibrancy = 1.15;   // CG-6 J153 40 (D-183, C2): the game's picture grade by default\r\n      try {\r\n        const b = localStorage.getItem('tt_brightness');\r\n        const v = localStorage.getItem('tt_vibrancy');\r\n        const bb = b == null ? 1.05 : snapPicture(b, BRIGHT_MIN, BRIGHT_MAX, 0.05);\r\n        const vv = v == null ? 1.15 : snapPicture(v, VIBRANT_MIN, VIBRANT_MAX, 0.05);\r\n"),
]
for a, c in R:
    n = s.count(a)
    if n != 1: sys.exit('hunk found %d times: %r' % (n, a[:70]))
    s = s.replace(a, c)
out = s.encode('utf-8')
if b'\n' in out.replace(b'\r\n', b''): sys.exit('bare LF would appear')
if len(sys.argv) > 3: open(sys.argv[3], 'wb').write(out); print('wrote', sys.argv[3], hashlib.md5(out).hexdigest())
else: print('dry ok', hashlib.md5(out).hexdigest())
