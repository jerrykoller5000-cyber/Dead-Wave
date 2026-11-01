@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
copy /Y qa\2026-10-31-GB-260\weapon-sidearms.before.js studio\weapon-sidearms.js
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 control: t242 on the test page with the BEFORE pistol mag" --minutes 20 -- node tools/tests/run-all.mjs t242 --jobs 1 --agent grokbot --task GB-260 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\page3-t242-before.log" 2>&1
copy /Y qa\2026-10-31-GB-260\weapon-sidearms.after.js studio\weapon-sidearms.js
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-t242control.txt"