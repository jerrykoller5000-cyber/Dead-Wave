param([switch]$FullBatch,
    [string]$ManifestPath = (Join-Path $PSScriptRoot 'manifest.json'),
    [string]$OutputPath = (Join-Path $PSScriptRoot 'Generated'))
$ErrorActionPreference = 'Stop'
$taskRunnerPath = Join-Path $PSScriptRoot 'run.mjs'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js is needed to run this batch. It is already installed on the game development PC.'
    exit 1
}
$taskManifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$taskSoundCount = @($taskManifest.sounds).Count
$taskPriorityCount = @($taskManifest.sounds | Where-Object { $_.priority }).Count
$taskTakeCount = $taskSoundCount * 4
Write-Host ''
Write-Host 'GRAVE SHIFT - ELEVENLABS SOUND BATCH'
Write-Host ('Source: {0}' -f $taskManifest.source)
Write-Host '1. Sample: first 3 priority sounds, one take each'
Write-Host ('2. Priority: all {0} starred sounds, one take each' -f $taskPriorityCount)
Write-Host ('3. Full batch: all {0} sounds, four takes each ({1} clips)' -f $taskSoundCount, $taskTakeCount)
Write-Host '4. Plan only: show full batch without generating'
if ($FullBatch) { $taskChoice = '3' }
else { $taskChoice = (Read-Host 'Choose 1, 2, 3 or 4 (Enter = sample)').Trim() }
$taskArgs = switch ($taskChoice) {
    '2' { @('--scope', 'priority', '--variants', '1') }
    '3' { @('--scope', 'all', '--variants', '4') }
    '4' { @('--scope', 'all', '--variants', '4') }
    default { @('--scope', 'priority', '--variants', '1', '--limit', '3') }
}
$taskArgs += @('--allow-moved-clips', 'true', '--manifest', $ManifestPath, '--output', $OutputPath)
$taskSummaryRaw = & node $taskRunnerPath summary @taskArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$taskSummary = $taskSummaryRaw | ConvertFrom-Json
Write-Host ''
Write-Host ('Sounds: {0}. Takes: {1}. Already saved: {2}.' -f $taskSummary.sounds, $taskSummary.clips, $taskSummary.progress.done)
if ($taskSummary.progress.exported -gt 0) {
    Write-Host ('Previously finished clips moved out of this folder: {0}. These will be skipped without charging again.' -f $taskSummary.progress.exported)
}
Write-Host ('Estimated remaining credits: {0}' -f $taskSummary.progress.estimatedRemainingCredits)
Write-Host 'Estimate uses published API rates; your account pricing determines actual charges.'
Write-Host ('Short clips generated at the API minimum of 0.5s: {0}' -f $taskSummary.shortClipsAdjusted)
Write-Host ('Saved in: {0}' -f $taskSummary.output)
if ($taskSummary.progress.uncertain -gt 0 -or $taskSummary.progress.conflicts -gt 0) {
    Write-Host 'Some clips need review before resuming. Read README.md and the progress file. Nothing will be generated.'
    exit 2
}
if ($taskChoice -eq '4' -or $taskSummary.progress.pending -eq 0) {
    Write-Host 'No generation needed. No credits used.'
    exit 0
}
$taskConfirm = Read-Host 'Generate this selection using your ElevenLabs credits? Type YES to begin'
if ($taskConfirm -cne 'YES') { Write-Host 'Plan saved. No credits used.'; exit 0 }
$taskKeySecure = Read-Host 'Enter your ElevenLabs API key (hidden; kept only for this session)' -AsSecureString
$taskKeyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskKeySecure)
$taskPreviousKey = $env:ELEVENLABS_API_KEY
try {
    $env:ELEVENLABS_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskKeyPtr)
    & node $taskRunnerPath generate @taskArgs --max-credits $taskSummary.progress.estimatedRemainingCredits
    $taskExitCode = $LASTEXITCODE
} finally {
    $env:ELEVENLABS_API_KEY = $taskPreviousKey
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskKeyPtr)
    $taskKeySecure.Dispose()
}
exit $taskExitCode
