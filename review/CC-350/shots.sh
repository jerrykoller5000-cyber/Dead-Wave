#!/bin/bash
# shots.sh <prefix> <views> [light]
declare -A V
V[game]='"cam":[0,9.91,-8.36],"look":[0,0.9,0],"fov":60'
V[gz]='"cam":[0,9.91,-8.36],"look":[0,0.9,0],"fov":9'
V[back]='"cam":[0,1.35,-2.6],"look":[0,0.92,0],"fov":32'
V[sideP]='"cam":[2.6,1.2,-0.1],"look":[0,0.9,-0.1],"fov":32'
V[sideN]='"cam":[-2.6,1.2,-0.1],"look":[0,0.9,-0.1],"fov":32'
V[front]='"cam":[0,1.35,2.6],"look":[0,0.92,0],"fov":32'
V[top]='"cam":[0,3.3,-0.35],"look":[0,0.9,-0.05],"fov":32'
V[q34]='"cam":[1.6,1.6,-1.9],"look":[0,0.95,-0.05],"fov":32'
V[q34n]='"cam":[-1.6,1.6,-1.9],"look":[0,0.95,-0.05],"fov":32'
V[cs]='"cam":[1.5,1.05,-0.25],"look":[0,1.0,-0.25],"fov":30'
V[csn]='"cam":[-1.5,1.05,-0.25],"look":[0,1.0,-0.25],"fov":30'
V[cb]='"cam":[0.5,1.15,-1.6],"look":[0,0.98,-0.2],"fov":34'
V[hP]='"cam":[1.9,0.95,-0.35],"look":[0,0.8,-0.05],"fov":34'
V[hN]='"cam":[-1.9,0.95,-0.35],"look":[0,0.8,-0.05],"fov":34'
V[hB]='"cam":[0.3,1.0,-1.9],"look":[0,0.8,0],"fov":34'
V[hF]='"cam":[0.4,1.0,1.9],"look":[0,0.8,0],"fov":34'
V[hq]='"cam":[1.2,1.05,-1.3],"look":[0.05,0.78,-0.05],"fov":30'
V[hqn]='"cam":[-1.2,1.05,-1.3],"look":[-0.05,0.78,-0.05],"fov":30'
l=${3:-noon}
for v in ${2//,/ }; do echo "{${V[$v]},\"light\":\"$l\",\"wait\":250}" | /home/claude/rq.sh shot-$1-$v - >/dev/null; done
python3 - "$1" "$2" <<'PY'
import sys
from PIL import Image
p, vs = sys.argv[1], sys.argv[2].split(',')
ims=[]
for v in vs:
    im=Image.open(f'/home/claude/repl/out/shot-{p}-{v}.png').convert('RGB')
    c=im.crop((640-75,375-85,640+75,375+85)).resize((300,340)) if v=='game' else im.crop((640-260,360-295,640+260,360+295)).resize((390,442))
    ims.append(c)
W=sum(i.width for i in ims); H=max(i.height for i in ims); S=Image.new('RGB',(W,H)); x=0
for i in ims: S.paste(i,(x,0)); x+=i.width
from PIL import ImageEnhance
S=ImageEnhance.Brightness(S).enhance(float(__import__("os").environ.get("BR","1.6")))
S.save(f'/home/claude/repl/out/{p}.jpg',quality=85); print(f'/home/claude/repl/out/{p}.jpg')
PY
