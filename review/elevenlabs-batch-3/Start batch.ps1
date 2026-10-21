param([switch]$FullBatch)
$ErrorActionPreference = 'Stop'
# GP-189: both menus share the existing paid receipts and hardened resume engine.
$taskSharedPath = Join-Path $PSScriptRoot '../elevenlabs-batch'
$taskSharedArgs = @{ ManifestPath = (Join-Path $taskSharedPath 'manifest-3.json'); OutputPath = (Join-Path $taskSharedPath 'Generated-3') }
if ($FullBatch) { $taskSharedArgs.FullBatch = $true }
& (Join-Path $taskSharedPath 'Start batch.ps1') @taskSharedArgs
exit $LASTEXITCODE
