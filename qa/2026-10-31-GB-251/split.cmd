@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-251 --checks "GB-251 split: index.html swap + node --check + dup scan, then night 20 --alloc x3 (throwaway + 2)" --minutes 30 -- cmd /c "qa\2026-10-31-GB-251\step1.cmd" > "qa\2026-10-31-GB-251\split-bench.slot.log" 2>&1
if errorlevel 1 goto end
node crew/crew.mjs slot run grokbot GB-251 --checks "GB-251 split, real renderer: t215 t95 page load + the zombie tests" --minutes 120 -- node tools/realtest.mjs t215 t95 t75 t77 t143 t205 t247 t249 t168 t209 t202 t48 t98 t112 t23 t78 --all > "qa\2026-10-31-GB-251\real-split.log" 2>&1
node crew/crew.mjs slot run grokbot GB-251 --checks "GB-251 split, test page: the same tests" --minutes 120 -- node tools/tests/run-all.mjs t215 t95 t75 t77 t143 t205 t247 t249 t168 t209 t202 t48 t98 t112 t23 t78 --agent grokbot --task GB-251 --jobs 1 --all-fails > "qa\2026-10-31-GB-251\page-split.log" 2>&1
:end
echo DONE > "qa\2026-10-31-GB-251\split.done"
