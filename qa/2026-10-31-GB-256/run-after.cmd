@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-256 --checks "GB-256 after: probe2 Training Ground, m4+pistol+shotgun+ak+uzi" --minutes 20 -- node qa\2026-10-31-GB-256\probe2.mjs after m4,pistol,shotgun,ak,uzi > "qa\2026-10-31-GB-256\after.log" 2>&1
node crew/crew.mjs slot run grokbot GB-256 --checks "GB-256 after: probe2 hunt match, m4+pistol" --minutes 20 -- node qa\2026-10-31-GB-256\probe2.mjs after m4,pistol --match > "qa\2026-10-31-GB-256\after-match.log" 2>&1
node crew/crew.mjs slot run grokbot GB-256 --checks "GB-256 real renderer: t215 t95 page load + t276 t182 t219 (aim kinds, the Training Ground)" --minutes 60 -- node tools/realtest.mjs t215 t95 t276 t182 t219 --all > "qa\2026-10-31-GB-256\real.log" 2>&1
node crew/crew.mjs slot run grokbot GB-256 --checks "GB-256 test page: the same tests" --minutes 60 -- node tools/tests/run-all.mjs t215 t95 t276 t182 t219 --agent grokbot --task GB-256 --jobs 1 --all-fails > "qa\2026-10-31-GB-256\page.log" 2>&1
echo DONE > "qa\2026-10-31-GB-256\after.done"
