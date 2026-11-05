@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
set D=C:\Users\Zero\Desktop\dw-gb272
if not exist %D%\live mkdir %D%\live
if not exist %D%\nozs mkdir %D%\nozs
set B=qa\2026-11-03-GB-272\bench-ab.mjs
set CHROME_ARGS=--no-sandbox
echo === DEOPT nozs
set BENCH_PAGE=nozs-index.html
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb272/nozs/v8.log
node %B% --night 20 --gfx high --seconds 150
echo === DEOPT live
set BENCH_PAGE=index.html
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb272/live/v8.log
node %B% --night 20 --gfx high --seconds 150
set CHROME_JS_FLAGS=
echo === ALLOC nozs-1
set BENCH_PAGE=nozs-index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC live-1
set BENCH_PAGE=index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC live-2
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC nozs-2
set BENCH_PAGE=nozs-index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === DONE
