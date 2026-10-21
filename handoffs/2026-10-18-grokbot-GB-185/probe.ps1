param([string]$Out)
$code=[IO.File]::ReadAllText("$PWD\handoffs\2026-10-18-grokbot-GB-185\probe.js")
node tools/camera.mjs start --match --agent grokbot --task GB-185 2>&1 | Select -Last 3
$r = node tools/camera.mjs eval $code --agent grokbot --task GB-185 2>&1 | Out-String
[IO.File]::WriteAllText("$PWD\handoffs\2026-10-18-grokbot-GB-185\$Out",$r,(New-Object Text.UTF8Encoding $false))
node tools/camera.mjs stop --agent grokbot --task GB-185 2>&1 | Select -Last 2
