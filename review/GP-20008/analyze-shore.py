"""Check whether a truly dry 4 m corridor skirts the SE wall's lake tip."""
import json
import math
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
D=json.loads((HERE/'shore-audit.json').read_text(encoding='utf-8'))
grid=D['rows']; h=len(grid); w=len(grid[0]); step=D['step']
xmin,zmin=D['xmin'],D['zmin']
def world(i,j): return xmin+i*step,zmin+j*step
def idx(x,z): return round((x-xmin)/step),round((z-zmin)/step)
def sample(x,z):
    i,j=idx(x,z)
    return grid[j][i] if 0<=i<w and 0<=j<h else None
def bad(i,j):
    wet,wall,slope=grid[j][i]
    return wet>.05 or wall>0 or slope>.5
R=2.0
offsets=[(di,dj) for dj in range(-math.ceil(R/step),math.ceil(R/step)+1)
         for di in range(-math.ceil(R/step),math.ceil(R/step)+1)
         if math.hypot(di,dj)*step<=R+1e-9]
safe=[[False]*w for _ in range(h)]
for j in range(h):
    for i in range(w):
        if not bad(i,j) and all(0<=i+di<w and 0<=j+dj<h and not bad(i+di,j+dj) for di,dj in offsets):
            safe[j][i]=True
a=(-45,-53.6); b=(-57.2,-68.2); ux,uz=b[0]-a[0],b[1]-a[1]
length=math.hypot(ux,uz)
def side(x,z): return ((x-a[0])*uz-(z-a[1])*ux)/math.hypot(ux,uz)
def beyond_tip(x,z): return ((x-a[0])*ux+(z-a[1])*uz)/length >= length-3
components=[]; seen=set(); candidates=[]
for j in range(h):
    for i in range(w):
        x,z=world(i,j)
        if not safe[j][i] or not beyond_tip(x,z) or (i,j) in seen: continue
        q=deque([(i,j)]); seen.add((i,j)); cells=[]; sides=[]
        while q:
            ci,cj=q.popleft(); cells.append((ci,cj))
            x,z=world(ci,cj); sides.append(side(x,z))
            for di,dj in [(1,0),(-1,0),(0,1),(0,-1)]:
                ni,nj=ci+di,cj+dj
                nx,nz=world(ni,nj)
                if 0<=ni<w and 0<=nj<h and safe[nj][ni] and beyond_tip(nx,nz) and (ni,nj) not in seen:
                    seen.add((ni,nj)); q.append((ni,nj))
        components.append({'cells':len(cells),'minSide':min(sides),'maxSide':max(sides)})
        if min(sides)<-4 and max(sides)>4: candidates.append(cells)
path=[]
if candidates:
    pass_set={p for component in candidates for p in component}
    neg=min((p for p in pass_set if side(*world(*p))<-4),key=lambda p:math.dist(world(*p),b))
    pos=min((p for p in pass_set if side(*world(*p))>4),key=lambda p:math.dist(world(*p),b))
    queue=deque([neg]); prev={neg:None}
    while queue and pos not in prev:
        ci,cj=queue.popleft()
        for di,dj in [(1,0),(-1,0),(0,1),(0,-1)]:
            q=(ci+di,cj+dj)
            if q in pass_set and q not in prev: prev[q]=(ci,cj); queue.append(q)
    if pos in prev:
        q=pos
        while q is not None: path.append(world(*q)); q=prev[q]
        path.reverse()
summary={'cells':[w,h],'dryWideComponents':components,'pass':bool(path),
         'path':[{'x':round(x,2),'z':round(z,2)} for x,z in path[::max(1,len(path)//12)] + ([path[-1]] if path else [])],
         'diagonalSample':[{'x':round(-55-.2*k,2),'z':round(-65-.2*k,2),
                            'water':sample(-55-.2*k,-65-.2*k)[0]}
                           for k in range(31) if k%5==0]}
(HERE/'shore-audit-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary))

pass_cells={p for component in candidates for p in component}
scale=8
im=Image.new('RGB',(w*scale+300,h*scale),(246,244,225)); draw=ImageDraw.Draw(im)
for j in range(h):
    for i in range(w):
        wet,wall,slope=grid[j][i]
        color='#6fa5b8' if wet>.05 else '#363d38' if wall else '#baad73' if slope>.5 else '#a8bd8d'
        if safe[j][i]: color='#d7eab1'
        if (i,j) in pass_cells: color='#f7e380'
        x=(w-1-i)*scale; y=(h-1-j)*scale
        draw.rectangle((x,y,x+scale,y+scale),fill=color)
def pix(x,z):
    i,j=idx(x,z); return ((w-1-i)*scale,(h-1-j)*scale)
p0,p1=pix(*a),pix(*b)
draw.line((*p0,*p1),fill='#a83c33',width=3)
draw.ellipse((p1[0]-7,p1[1]-7,p1[0]+7,p1[1]+7),fill='#f4f0e0',outline='#a83c33',width=3)
if path: draw.line([pix(x,z) for x,z in path],fill='#276641',width=5)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
draw.text((w*scale+18,30),'SE SHORE / 0.25 m grid',font=font,fill='#263c34')
for k,(label,col) in enumerate([('water > 0.05 m','#6fa5b8'),('solid block','#363d38'),
                                 ('dry 4 m clearance','#d7eab1'),('connected passage','#f7e380')]):
    y=85+k*45; draw.rectangle((w*scale+20,y,w*scale+45,y+25),fill=col)
    draw.text((w*scale+55,y),label,font=font,fill='#263c34')
draw.text((w*scale+20,320),'4 m wide dry path:',font=font,fill='#263c34')
draw.text((w*scale+20,350),'PASS' if candidates else 'FAIL',font=font,fill='#9d3333' if not candidates else '#36643b')
im.save(HERE/'shore-audit.png')
