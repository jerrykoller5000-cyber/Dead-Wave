@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-before-0.log 2>&1
node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-before-1.log 2>&1
node tools/bench.mjs --night 20 --gfx high --prof --alloc > qa\2026-10-31-GB-251\alloc-before-2.log 2>&1
echo done > qa\2026-10-31-GB-251\before.done
