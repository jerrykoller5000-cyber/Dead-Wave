@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260: t242 with the deeper-but-narrower pistol body, test page" --minutes 20 -- node tools/tests/run-all.mjs t242 --jobs 1 --agent grokbot --task GB-260 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\page4-t242.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-t242page4.txt"