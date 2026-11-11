#!/bin/bash
# tests.sh <out> <tests...>: wait for no game running, then run-all in the cloud slot
while pgrep -f "fptune5.mjs|expr5.sh|run-all.mjs" >/dev/null; do sleep 10; done
cd /home/claude/gs306 && out=$1; shift; timeout 1500 node tools/tests/run-all.mjs "$@" --jobs 1 --agent claude4 --task CD-1 > $out 2>&1; echo EXIT $? >> $out
