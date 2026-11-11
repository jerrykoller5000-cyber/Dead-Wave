#!/bin/bash
# after.sh <out> <gun>...: wait for no fptune5 running, then expr5 each
while pgrep -f "fptune5.mjs|expr5.sh" >/dev/null; do sleep 10; done
export CHROME_ARGS="--js-flags=--max-old-space-size=7000 --disable-dev-shm-usage"
out=$1; shift; for g in "$@"; do bash /home/claude/gs306/tools/handfit/c4/expr5.sh $out $g; done
