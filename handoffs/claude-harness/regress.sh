#!/bin/sh
# Runs every tNN.js against test.html, three at a time; results in r_tNN.txt.
cd "$(dirname "$0")"
ls t*.js | sed 's/\.js$//' | xargs -P 3 -I{} sh -c 'timeout 200 node run.mjs {}.js > r_{}.txt 2>&1'
for f in r_t*.txt; do n=$(grep -c "^FAIL" "$f"); p=$(grep -c "^PASS" "$f"); e=$(grep -c PAGEERROR "$f"); echo "$f pass=$p fail=$n pageerrors=$e"; done
