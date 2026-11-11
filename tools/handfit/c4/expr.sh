#!/bin/bash
# exp.sh <out> <gun>: exp4 with up to 3 tries (the page crashes now and then at the raise)
for i in 1 2 3; do bash /home/claude/gs306/tools/handfit/c4/exp4.sh $1 $2 >/dev/null 2>&1; [ -f $1/shots/$2.json ] && { echo "$2 ok (try $i)"; exit 0; }; done; echo "$2 FAILED"; exit 1
