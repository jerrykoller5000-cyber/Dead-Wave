@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === t224 halo forced visible
node qa/2026-11-03-GB-276/rt.mjs qa/2026-11-03-GB-276/t224-halo.js
echo === t224 with effect meshes skipped
node qa/2026-11-03-GB-276/rt.mjs qa/2026-11-03-GB-276/t224-skip.js
echo === t189 second run
node tools/realtest.mjs t189 --all
echo === DONE
