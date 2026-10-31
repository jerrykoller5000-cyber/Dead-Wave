@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-250 --checks "GB-250 after 1: t112 t168 t171 on game time (test page)" --minutes 30 -- node tools/tests/run-all.mjs t112 t168 t171 --jobs 1 --all-fails --agent grokbot --task GB-250 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-250\after-page-run1.log" 2>&1
node crew/crew.mjs slot run grokbot GB-250 --checks "GB-250 after 1: t112 t168 t171 on game time (real renderer)" --minutes 30 -- node tools/realtest.mjs t112 t168 t171 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-250\after-real-run1.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-250\after1.done"