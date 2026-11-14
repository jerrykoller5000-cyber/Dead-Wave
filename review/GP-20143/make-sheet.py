from PIL import Image, ImageDraw, ImageFont
import json, pathlib, statistics
root=pathlib.Path('review/GP-20143'); r=json.loads((root/'native-receipts.json').read_text(encoding='utf-8'))
assert len(r['frames'])==36, 'Wait for all proof frames'
try: font=ImageFont.truetype('arial.ttf',21); small=ImageFont.truetype('arial.ttf',17)
except OSError: font=small=ImageFont.load_default()
for env,labels in [('training',['noon','overcast','dusk','night','lights-off']),('outdoor',['noon','overcast','dusk','night'])]:
 w,h=640,360; sheet=Image.new('RGB',(4*w,70+len(labels)*(h+37)),(23,25,28));d=ImageDraw.Draw(sheet)
 d.text((15,10),f'D-183 / CG-6 note40 / {env.upper()} / native WebGPU / matched frozen camera',font=font,fill='white')
 for col,title in enumerate(['BEFORE eye 1.00 / 1.00','AFTER eye 1.05 / 1.15','BEFORE 3P 1.00 / 1.00','AFTER 3P 1.05 / 1.15']):d.text((col*w+8,42),title,font=small,fill=(220,220,220))
 for row,label in enumerate(labels):
  for col,(first,after) in enumerate([(True,False),(True,True),(False,False),(False,True)]):
   item=next(x for x in r['frames'] if x['environment']==env and x['label']==label and x['first']==first and x['after']==after)
   im=Image.open(root/item['file']).convert('RGB').resize((w,h),Image.Resampling.LANCZOS);x,y=col*w,70+row*(h+37);sheet.paste(im,(x,y));s=item['state'];d.text((x+8,y+h+5),f"{label}: hemi {s['hemi']['intensity']:.3f}, sun {s['sun']:.3f}",font=small,fill='white')
 sheet.save(root/f'{env}-matched-sheet.jpg',quality=94)
summary={'scope':r['scope'],'frames':len(r['frames']),'matched_camera_pairs':18,'sourceSha256':r['sourceSha256'],'endSourceSha256':r.get('endSourceSha256'),'diskSourceUnchanged':r['sourceSha256']==r.get('endSourceSha256'),'trainingErrors':r.get('trainingErrors'),'outdoorErrors':r.get('outdoorErrors'),'timings':[]}
for x in r['timings']:
 a=sorted(x['frames']);summary['timings'].append({'pass':x['pass'],'after':x['after'],'n':len(a),'mean':statistics.mean(a),'p95':a[min(len(a)-1,int(len(a)*.95))],'max':max(a)})
summary['blocks']=[]
for i in range(0,12,4):
 a=summary['timings'][i:i+4];before=statistics.mean(x['mean'] for x in a if not x['after']);after=statistics.mean(x['mean'] for x in a if x['after']);summary['blocks'].append({'block':i//4,'beforeMean':before,'afterMean':after,'afterPercent':100*(after/before-1)})
(root/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary,indent=2))