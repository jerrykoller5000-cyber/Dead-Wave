"""Read-only pack inspection; writes JSON paths and measurements, never audio."""
import sys, json, pathlib, wave, math
import numpy as np
sys.path.insert(0, r'C:\Users\Zero\AppData\Local\Temp\grave-shift-xls')
import xlrd

ROOT = pathlib.Path(__file__).resolve().parents[2]
PACK = pathlib.Path(r'F:\Sound_Effects\UI\Binary_Code_3_Interface_Multiverse\Binary Code 3 - Interface Multiverse')
FAMILY = {
    'n': ('1. Neutral (Simple)', 'Interface_Neutral_Simple'),
    'g': ('3. Confirmed (Access Granted)', 'Interface_Access_Granted'),
    'd': ('4. Denied (Access Denied)', 'Interface_Access_Denied'),
    't': ('9. Typing', 'Interface_Typing'),
}
# Separate pairs for signature events; repeated physical keys share a family.
# Entries are (family, take IDs, rule, purpose, maximum seconds or None).
PICKS = {
    'ui/click': ('n', [50,106], 'immersive', 'close military terminal button', .24),
    'ui/hover': ('n', [16,102], 'immersive', 'quiet military terminal focus', .18),
    'ui/back': ('n', [10,28], 'immersive', 'military terminal cancel key', .24),
    'ui/map-open': ('n', [23,41], 'immersive', 'military map display opening', .32),
    'ui/map-close': ('n', [4,22], 'immersive', 'military map display closing', .28),
    'ui/expand': ('n', [69,93], 'immersive', 'military panel expansion', .30),
    'ui/objective': ('g', [83,92], 'impactful', 'objective confirmed by the military terminal', None),
    'ui/badge': ('g', [62,13], 'impactful', 'distinct military commendation confirmation', None),
    'ui/dawn-card': ('g', [23,51], 'impactful', 'dawn duty report from the military terminal', None),
    'ui/victory': ('g', [81,84], 'impactful', 'final extraction confirmation on the military terminal', None),
    'ui/day-cleared': ('g', [26,34], 'impactful', 'distinct military all-clear confirmation', None),
    'ui/streak': ('g', [69,30], 'impactful', 'short military streak confirmation', None),
    'ui/wave-start': ('d', [117,90], 'impactful', 'military terminal threat warning, below weapons and HQ alarm', None),
    'ui/game-over': ('d', [111,33], 'impactful', 'distinct low military terminal loss report', None),
    'ui/missing-in-action': ('d', [21,11], 'impactful', 'distinct military terminal missing-person report', None),
    'ui/deja-vu': ('d', [98,41], 'impactful', 'low electrical unease inside the military terminal family', None),
    'ui/reset-blip': ('n', [45,40], 'immersive', 'military terminal reset acknowledgement', .30),
    'ui/kiosk-tab': ('n', [46,52], 'immersive', 'close military requisition kiosk tab', .24),
    'ui/shop-tab': ('n', [60,86], 'immersive', 'close military shop tab', .24),
    'ui/panel-key': ('t', [72,22], 'immersive', 'single isolated military terminal keystroke, not the typing loop', .14),
    'ui/panel-beep': ('n', [50,106], 'immersive', 'short military terminal feedback, not the mast signal', .24),
    'ui/panel-open': ('g', [27,53], 'immersive', 'military relay panel responding to power', None),
    'ui/panel-deny': ('d', [67,17], 'impactful', 'military relay rejects an input', .80),
    'training/keypad-press': ('n', [16,102], 'immersive', 'close military keypad switch', .18),
    'training/keypad-accept': ('g', [36,56], 'impactful', 'military keypad accepts the code', None),
    'training/keypad-deny': ('d', [4,75], 'impactful', 'military keypad rejects the code', None),
    'training/panel-beep': ('n', [10,28], 'immersive', 'Training Ground military control panel', .24),
    'training/panel-enter': ('g', [91,71], 'immersive', 'Training Ground military terminal ready', None),
    'training/panel-clear': ('g', [104,82], 'impactful', 'Training Ground clear-all command accepted', None),
    'training/panel-blackout': ('d', [3,105], 'impactful', 'Training Ground military terminal loses power', None),
}

book = xlrd.open_workbook(str(next(PACK.glob('*.xls'))))
sheet = book.sheet_by_index(0)
catalogue = {sheet.cell_value(r,0): sheet.cell_value(r,1) for r in range(1,sheet.nrows)}
measurements = {}

def read(f):
    with wave.open(str(f),'rb') as w:
        count, rate, channels, width = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw=w.readframes(count)
    if width==3:
        v=np.frombuffer(raw,dtype=np.uint8).reshape(-1,3).astype(np.int32)
        x=v[:,0]|v[:,1]<<8|v[:,2]<<16
        x=np.where(x&8388608,x-16777216,x)/8388608
    elif width==2: x=np.frombuffer(raw,dtype='<i2')/32768
    else: raise ValueError((f,width))
    return x.reshape(-1,channels), rate, width

manifest={}
for dest,(family,ids,rule,purpose,limit) in PICKS.items():
    folder,prefix=FAMILY[family]
    takes=[]
    for ident in ids:
        stem=f'{prefix}_{ident:03d}'
        assert stem in catalogue, stem
        f=PACK/folder/(stem+'.wav')
        x,rate,width=read(f)
        p=np.max(np.abs(x),axis=1)
        hits=np.flatnonzero(p>10**(-50/20))
        assert len(hits),f
        start=max(0,hits[0]/rate-.005)
        end=min(len(x)/rate,(hits[-1]+1)/rate+.04)
        if limit is not None:end=min(end,start+limit)
        # Typing files are multi-second runs: isolate their first impulse and
        # require a conversion fade. Never schedule the complete source loop.
        start=math.floor(start*1000)/1000
        end=math.ceil(end*1000)/1000
        samples=x[int(start*rate):int(end*rate)]
        peak=float(np.max(np.abs(samples)))
        rms=float(np.sqrt(np.mean(samples*samples)))
        assert 0<=start<end<=len(x)/rate and rms>.001,(dest,f,start,end,rms)
        if dest in ['ui/click','ui/hover','ui/back','ui/kiosk-tab','ui/shop-tab']:
            assert end-start<.25,(dest,end-start)
        why=f'{rule.capitalize()}; military terminal / {folder}: {purpose}. Candidate pending in-game listening; fade trim edges 5-10 ms.'
        takes.append(dict(src=str(f),why=why,start=start,end=end))
        measurements[f'{dest}/{stem}']={
            'sourceSeconds':round(len(x)/rate,6),'start':start,'end':end,
            'selectedSeconds':round(end-start,6),'sampleRate':rate,'channels':x.shape[1],
            'bits':width*8,'peakDbFS':round(20*math.log10(max(peak,1e-12)),2),
            'rmsDbFS':round(20*math.log10(max(rms,1e-12)),2),
            'catalogueRow':next(r+1 for r in range(1,sheet.nrows) if sheet.cell_value(r,0)==stem),
        }
    manifest[dest]=takes

existing={f'ui/{p.name}' for p in (ROOT/'z-sounds/ui').iterdir() if p.is_dir()}
assert not existing-set(manifest),existing-set(manifest)
assert all(2<=len(v)<=5 for v in manifest.values())
out=ROOT/'docs/audio/packs/ui.json'
assert not out.exists(), 'Refusing to overwrite a live manifest; merge any future changes.'
out.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
report={
    'catalogue':str(next(PACK.glob('*.xls'))),'sheet':sheet.name,
    'catalogueEntries':len(catalogue),'existingUiFolders':sorted(existing),
    'destinations':len(manifest),'selections':sum(map(len,manifest.values())),
    'uniqueSources':len({v['src'] for a in manifest.values() for v in a}),
    'checks':'PASS: catalogue membership, readable PCM, valid trims, audible energy, 2-5 takes/destination, every existing UI folder, repeated UI keys under 0.25 s',
    'notVerified':'Not heard by a person; no converted audio, loudness normalization, runtime wiring or in-game mix/performance check. RMS is not LUFS.',
    'measurements':measurements,
}
(ROOT/'handoffs/GP-19975/selection-proof.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(f"PASS: {len(manifest)} destinations, {report['selections']} selections, {report['uniqueSources']} source WAVs; {len(existing)}/{len(existing)} existing UI folders covered. No audio copied or changed.")
