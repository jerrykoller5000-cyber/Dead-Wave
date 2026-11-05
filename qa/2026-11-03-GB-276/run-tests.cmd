@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
echo === REAL
node tools/realtest.mjs t189 t140 t150 t195 t224 t107 t180 t185 t202 t228 t215 t95 --all
echo === TESTPAGE
node tools/tests/run-all.mjs t215 t95 t188 t189 t140 t150 t195 t224 t107 t180 t185 t202 --jobs 1 --all-fails --agent grokbot --task GB-276
echo === SMOKE
node tools/smoke-real.mjs
echo === DONE
