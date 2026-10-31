@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-250 --checks "GB-250 control: the unchanged t112 t168 t171 (temporary copies tgb250b*) on today's test page, after CU-181's fakethree change" --minutes 30 -- node tools/tests/run-all.mjs tgb250b112 tgb250b168 tgb250b171 --jobs 1 --all-fails --agent grokbot --task GB-250 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-250\control-page-old.log" 2>&1
del "C:\Users\Zero\Desktop\Tiny Trek\tools\tests\tgb250b112.js" "C:\Users\Zero\Desktop\Tiny Trek\tools\tests\tgb250b168.js" "C:\Users\Zero\Desktop\Tiny Trek\tools\tests\tgb250b171.js"
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-250\control.done"