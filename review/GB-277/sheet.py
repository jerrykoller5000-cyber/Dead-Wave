from PIL import Image, ImageDraw
import glob, os
U=['003','012','025','040','055','070','085','097']
for tag in ['side','q']:
    ims={}
    for mode in ['before','after']:
        ims[mode]=[Image.open(f'review/GB-277/{mode}/{tag}-{u}.png').convert('RGB') for u in U]
    w,h=ims['after'][0].size
    sc=0.42; tw,th=int(w*sc),int(h*sc)
    sheet=Image.new('RGB',(tw*4,(th+0)*4),(20,20,20))
    d=ImageDraw.Draw(sheet)
    for mi,mode in enumerate(['before','after']):
        for i,u in enumerate(U):
            r=mi*2+i//4; c=i%4
            t=ims[mode][i].resize((tw,th))
            sheet.paste(t,(c*tw,r*th))
            d.text((c*tw+6,r*th+6),f'{mode} u={int(u)/100:.2f}',fill=(255,255,0))
    sheet.save(f'review/GB-277/sheet2-{tag}.jpg',quality=88)
    print(tag,sheet.size)

