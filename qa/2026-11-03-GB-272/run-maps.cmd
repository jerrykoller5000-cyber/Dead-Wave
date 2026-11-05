@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
set D=C:\Users\Zero\Desktop\dw-gb272\maps
if not exist %D% mkdir %D%
set CHROME_ARGS=--no-sandbox
set BENCH_PAGE=index.html
set CHROME_JS_FLAGS=--log-code --log-deopt --log-maps --log-maps-details --logfile=C:/Users/Zero/Desktop/dw-gb272/maps/v8.log
node qa\2026-11-03-GB-272\bench-ab.mjs --night 20 --gfx high --seconds 70
echo === DONE
