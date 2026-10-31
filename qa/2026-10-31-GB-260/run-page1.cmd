@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 test page: the full weapon set on the stand-in renderer" --minutes 30 -- node tools/tests/run-all.mjs t242 t217 t121 t277 t38 t194 --jobs 1 --agent grokbot --task GB-260 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\page1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-page1.txt"