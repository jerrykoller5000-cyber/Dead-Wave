@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node tools/camera.mjs check wire --out qa/2026-10-27-GB-242/%1/noon --time noon --agent grokbot --task GB-242
node tools/camera.mjs check wire --out qa/2026-10-27-GB-242/%1/dusk --time dusk --agent grokbot --task GB-242
node tools/camera.mjs check wire --out qa/2026-10-27-GB-242/%1/night --time night --agent grokbot --task GB-242
node tools/camera.mjs check wire --out qa/2026-10-27-GB-242/%1/overcast --time overcast --agent grokbot --task GB-242

