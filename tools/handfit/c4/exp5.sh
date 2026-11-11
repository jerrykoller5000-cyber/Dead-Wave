#!/bin/bash
# exp4.sh <out dir> <gun>... : as exp5.sh, the export with the arms (ex4-<gun>.json)
out=$1; shift
for g in "$@"; do mkdir -p $out/queue; touch $out/queue/stop; cd /home/claude/gs306 && NOSHOT=1 VW=320 VH=180 timeout 600 node tools/game-test-slot.mjs run claude4 CD-1 --checks "$g export" -- node tools/handfit/c4/fptune5.mjs $out/shots /home/claude/fpshot/ex6-$g.json > $out/log-$g.txt 2>&1; ls $out/shots/$g.json >/dev/null && echo "$g ok"; done
