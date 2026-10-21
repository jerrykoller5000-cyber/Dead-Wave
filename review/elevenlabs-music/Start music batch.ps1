# CL-163: the music batch launcher (ChatGPT's GP-182 "Start batch.ps1", reworded for music).
param([string]$ManifestPath = (Join-Path $PSScriptRoot 'manifest-music.json'),
    [string]$OutputPath = (Join-Path $PSScriptRoot '..\..\z-music'))
$ErrorActionPreference = 'Stop'
$taskRunnerPath = Join-Path $PSScriptRoot 'run-music.mjs'
$OutputPath = [IO.Path]::GetFullPath($OutputPath)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js is needed to run this batch. It is already installed on the game development PC.'
    exit 1
}
$taskManifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$taskTracks = @($taskManifest.tracks).Count
$taskMinutes = [math]::Round((@($taskManifest.tracks) | Measure-Object -Property seconds -Sum).Sum / 60, 1)
$taskPerMinute = $taskManifest.creditsPerMinute
Write-Host ''
Write-Host 'GRAVE SHIFT - ELEVENLABS MUSIC BATCH (metal / chiptune)'
Write-Host ('{0} tracks, {1} minutes of music for one take of each. Estimated {2} credits per minute.' -f $taskTracks, $taskMinutes, $taskPerMinute)
Write-Host 'Takes go straight into the z-music folder. Delete the ones you do not like; they are never made again.'
Write-Host ''
Write-Host '1. Test: 2 tracks (the wave alarm sting and night 20), one take each'
Write-Host ('2. One take of every track       (about {0} credits)' -f [math]::Round($taskMinutes * $taskPerMinute))
Write-Host ('3. Two takes of every track      (about {0} credits)' -f [math]::Round($taskMinutes * $taskPerMinute * 2))
Write-Host ('4. Four takes of every track     (about {0} credits)' -f [math]::Round($taskMinutes * $taskPerMinute * 4))
Write-Host '5. Plan only: show what would be made, without generating'
Write-Host 'Takes are made in rounds (one of everything first), and anything already made is skipped,'
Write-Host 'so you can pick 2 now and 4 later, or press Ctrl+C at any time and carry on later.'
$taskChoice = (Read-Host 'Choose 1-5 (Enter = test)').Trim()
$taskArgs = switch ($taskChoice) {
    '2' { @('--scope', 'all', '--variants', '1') }
    '3' { @('--scope', 'all', '--variants', '2') }
    '4' { @('--scope', 'all', '--variants', '4') }
    '5' { @('--scope', 'all', '--variants', '4') }
    default { @('--scope', 'test', '--variants', '1') }
}
$taskArgs += @('--allow-moved-clips', 'true', '--manifest', $ManifestPath, '--output', $OutputPath)
$taskSummaryRaw = & node $taskRunnerPath summary @taskArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$taskSummary = $taskSummaryRaw | ConvertFrom-Json
Write-Host ''
Write-Host ('Tracks: {0}. Takes: {1} ({2} minutes). Already made: {3}.' -f $taskSummary.sounds, $taskSummary.clips, $taskSummary.minutes, $taskSummary.progress.done)
if ($taskSummary.progress.exported -gt 0) {
    Write-Host ('Takes you deleted or moved: {0}. These are skipped without charging again.' -f $taskSummary.progress.exported)
}
Write-Host ('Estimated remaining credits: {0}' -f $taskSummary.progress.estimatedRemainingCredits)
Write-Host 'This is an estimate; your ElevenLabs plan decides the real price (the website shows it before you generate).'
Write-Host ('Saved in: {0}' -f $taskSummary.output)
if ($taskSummary.progress.uncertain -gt 0 -or $taskSummary.progress.conflicts -gt 0) {
    Write-Host 'Some takes need review before resuming. Read README.md and the progress file. Nothing will be generated.'
    exit 2
}
if ($taskChoice -eq '5' -or $taskSummary.progress.pending -eq 0) {
    Write-Host 'No generation needed. No credits used.'
    exit 0
}
$taskConfirm = Read-Host 'Make this music using your ElevenLabs credits? Type YES to begin'
if ($taskConfirm -cne 'YES') { Write-Host 'Nothing made. No credits used.'; exit 0 }
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
