# claude8 - CH-1 landing 3: AH-4 menu replay fixes (+ AH-6 #7, AH-4 #24b) - 2026-11-21
Changed:          Nothing in the game yet. Landing 3 is READY and waits on the Director's LOOK (asked 07:17Z, addendum 07:18Z; no answer by 07:36Z).
Files:            Ready copy: Claude outputs/CH-1-menus/landing3/ui-kit.css (only file; mine) + ui-kit.css.diff + sheetG-landing3.jpg + request.md + addendum.md.
                  Live ui/ui-kit.css still 60d3475b (landing 1/2). index.html fcdde575 at 07:36Z - not touched, no loans needed.
What it fixes:    #10 range console fits 1366x768 (melee + VOID boxes slim on screens <=860 tall; "2. Drill" y 807 -> 577).
                  #11 CIF: card up to 900 tall; short screens tighter; first PATTERNS row whole at 1366 and 1920.
                  #12 armory: ARMORY/RESUPPLY titles gold stencil (were Impact); hip pistol on a lit backdrop; short screens tighter, 4 slots + hip above the Done bar.
                  #17 settings: one-line labels (128 px column, 900+ wide), rows closer on short screens, no scrollbar at 768.
                  #18 [E] prompt hidden while a menu is open; #24b top-left notice card (#bigBanner) hidden while shop/CIF/range/HQ panel open.
                  AH-6 #7: supply-terminal title cursor removed; shop lines wrap to 3 (MedPen whole).
Tests:            DOM fixture renders of the real CSS + real range-console.js / armory.js modules at 1366x768, 1280x720, 1920x1080, 960x1040; numbers in request.md. ASCII-only (t215 regex clean). 1920 range console: zero pixel change. Game tests not run (nothing landed).
How to land:      Director OK -> check ui/ui-kit.css md5 is still 60d3475b -> copy it to "_DELETE ME/ch1-backup/ui-kit.css.landing2" -> copy landing3/ui-kit.css over ui/ui-kit.css (LF, like the live file) -> t215 through the slot -> native look: job Claude outputs/CH-1-menus/landing3/job-CH1-landing3-after.json (10 shots) to Antigravity 2 or ChatGPT 3.
Not verified:     Native GPU look (needs the landing first). Fixture has no 3D workbench preview: real BUY AMMO sits ~120 px lower than in the sheet (still above the bar by estimate). Windows Impact only shows natively.
Notes:            The cloud soft camera (SwiftShader) never reached Training this run (TT needs ?debug=1; boot then stalled >5 min). DOM fixture is faster: index.html with scripts stripped + strings.js fill + module imports.
Next:             Land 3 after the LOOK; then ranked list: one amber (with Claude 9), one close, button family, 11 px floor, weapon wheel.
