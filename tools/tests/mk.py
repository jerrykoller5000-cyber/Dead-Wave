import sys, re
src = open(sys.argv[1], encoding='utf-8').read()
src = src.replace('https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.webgpu.js', './fakethree.mjs')
src = src.replace('https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.tsl.js', './faketsl.mjs')
src = src.replace('https://cdn.jsdelivr.net/npm/three@0.175.0/examples/jsm/', './addons/')
open(sys.argv[2], 'w', encoding='utf-8').write(src)
