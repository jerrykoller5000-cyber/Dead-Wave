from pathlib import Path
import json
from PIL import Image, ImageDraw

out=Path(__file__).resolve().parent
times=[0,.06,.12,.24,.42,1.4]
sheet=Image.new('RGB',(1920,880),'#151d18');draw=ImageDraw.Draw(sheet)
for row,(phase,kind) in enumerate([('before-valid','bullet'),('after-final','bullet'),('before-valid','knife'),('after-final','knife')]):
    receipt=json.loads((out/f'{phase}-reaction.json').read_text())
    frames=[f for f in receipt['frames'] if f['kind']==kind and f['view']=='approach' and f['light']=='noon']
    assert [f['t'] for f in frames]==times
    for col,f in enumerate(frames):
        im=Image.open(out/f['name']).convert('RGB');im.thumbnail((320,180));sheet.paste(im,(col*320,row*220+35))
        draw.text((col*320+5,row*220+4),f'{phase} {kind} t={f["t"]:.2f}s',fill='#ede3bf')
        draw.text((col*320+5,row*220+18),f'tilt={f["state"]["tiltRad"]*180/3.1415926536:.2f} deg',fill='#ede3bf')
sheet.save(out/'dummy-reaction-sheet.jpg',quality=92)
sheet=Image.new('RGB',(1920,620),'#151d18');draw=ImageDraw.Draw(sheet)
for row,phase in enumerate(['before','after-final']):
    for col,light in enumerate(['noon','overcast','dusk','night']):
        im=Image.open(out/f'{phase}-keypad-lit-{light}.png').convert('RGB')
        full=im.copy();full.thumbnail((480,270));sheet.paste(full,(col*480,row*310+30))
        inset=im.crop((575,290,710,420));inset.thumbnail((120,120));sheet.paste(inset,(col*480+350,row*310+35))
        draw.text((col*480+8,row*310+8),f'{phase} / {light}; inset same pixels',fill='#ede3bf')
sheet.save(out/'keypad-four-lights.jpg',quality=92)
print('dummy-reaction-sheet.jpg; keypad-four-lights.jpg')
