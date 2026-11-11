#!/bin/bash
# look.sh <export> <name> : cam + close views of the support hand, one sheet
cd /home/claude/gs306/tools/handfit/look
node shoot2.mjs $1 /home/claude/work/pics/$2-a.png cam,eye >/dev/null
FOCUS=l ZOOM=1.3 node shoot2.mjs $1 /home/claude/work/pics/$2-b.png left,below,front,above >/dev/null
cd /home/claude/work/pics && python3 /home/claude/gs306/tools/handfit/look/sheet.py $2.jpg $2-a-cam.png $2-a-eye.png $2-b-left.png $2-b-below.png $2-b-front.png $2-b-above.png
