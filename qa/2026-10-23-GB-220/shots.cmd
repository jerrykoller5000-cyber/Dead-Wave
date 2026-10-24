@echo off
set A=--agent grokbot --task GB-220
set O=qa\2026-10-23-GB-220\%1
node tools/camera.mjs start --match %A%
node tools/camera.mjs eval %A% "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true})); if(T.isUnarmed&&!T.isUnarmed()) T.toggleHolster(); await new Promise(r=>setTimeout(r,1500)); return 'ok'"
for %%P in (m4.ak ak.m4 aa12.shotgun shotgun.aa12 flamer.chainsaw chainsaw.flamer launcher.sniper) do (
  for /f "tokens=1,2 delims=." %%a in ("%%P") do (
    node tools/camera.mjs eval %A% "T.carryDbg({loadout:{primary:['%%a','%%b'],secondary:['uzi','revolver']},inHand:null,akimbo:false}); await new Promise(r=>setTimeout(r,300)); return 'ok'"
    node tools/camera.mjs shot player %A% --view top --zoom 2.4 --out %O%\stow-%%a-%%b-top.png
    node tools/camera.mjs shot player %A% --view back --zoom 2.4 --out %O%\stow-%%a-%%b-back.png
  )
)
node tools/camera.mjs stop %A%
