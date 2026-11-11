#!/bin/bash
# lookr.sh <export> <name> [hl parts]: cam + close views of the firing hand, one sheet
cd /home/claude/gs306/tools/handfit/look
node shoot2.mjs $1 /home/claude/work/pics/$2-a.png cam,eye "$3" >/dev/null
FOCUS=r ZOOM=${ZOOM:-1.0} node shoot2.mjs $1 /home/claude/work/pics/$2-b.png right,left,below,front "$3" >/dev/null
cd /home/claude/work/pics && python3 /home/claude/gs306/tools/handfit/look/sheet.py $2.jpg $2-a-cam.png $2-a-eye.png $2-b-right.png $2-b-left.png $2-b-below.png $2-b-front.png
