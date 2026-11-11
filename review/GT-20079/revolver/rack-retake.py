from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
sheet = Image.new('RGB', (1070, 467), '#20242b')
draw = ImageDraw.Draw(sheet)
for column, (name, label) in enumerate((('factory', 'Factory'), ('camo', 'M81'), ('restored', 'Factory restored'))):
    x = 8 + 354*column
    draw.text((x,6), label, fill='white')
    for row, (phase,title) in enumerate((('after','Original display copy'), ('carry-fixed','CB-299 display copy'))):
        y = 24 + row*218
        draw.text((x,y),title,fill='#d6dee7')
        with Image.open(root/phase/f'rack-{name}.jpg') as source:
            tile = source.crop((321,168,833,456)).resize((345,194),Image.Resampling.LANCZOS)
        sheet.paste(tile,(x,y+16))
sheet.save(root/'rack-retake.jpg',quality=95)
