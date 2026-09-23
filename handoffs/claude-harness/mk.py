# Copies the game page and points its three.js imports at the stand-ins in this folder.
# Usage: python mk.py <index.html> test.html
import sys
src = open(sys.argv[1], encoding='utf-8').read()
for a, b in [
    # vendored (2026-09-23 on)
    ('"./vendor/three/three.webgpu.js"', '"./fakethree.mjs"'),
    ('"./vendor/three/three.tsl.js"', '"./faketsl.mjs"'),
    ('"./vendor/three/addons/"', '"./addons/"'),
    # CDN (before)
    ('https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.webgpu.js', './fakethree.mjs'),
    ('https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.tsl.js', './faketsl.mjs'),
    ('https://cdn.jsdelivr.net/npm/three@0.175.0/examples/jsm/', './addons/'),
]:
    src = src.replace(a, b)
if './fakethree.mjs' not in src:
    sys.exit('mk.py: could not find the three.js import map entries to replace')
open(sys.argv[2], 'w', encoding='utf-8').write(src)
