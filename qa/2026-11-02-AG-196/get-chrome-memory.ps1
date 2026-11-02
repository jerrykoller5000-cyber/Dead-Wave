param(
    [string]$Tag = "AG-196"
)

$allChrome = Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('chrome.exe', 'msedge.exe') }
if (-not $allChrome) {
    Write-Output "[]"
    exit 0
}

$root = $allChrome | Where-Object { $_.CommandLine -like "*$Tag*" -and $_.CommandLine -notlike "*--type=*" }
if (-not $root) {
    $root = $allChrome | Where-Object { $_.CommandLine -notlike "*--type=*" } | Select-Object -First 1
}

if (-not $root) {
    Write-Output "[]"
    exit 0
}

$rootPid = $root.ProcessId
$pids = [System.Collections.Generic.HashSet[int]]::new()
$null = $pids.Add($rootPid)

$added = $true
while ($added) {
    $added = $false
    foreach ($pItem in $allChrome) {
        if ($pids.Contains($pItem.ParentProcessId) -and -not $pids.Contains($pItem.ProcessId)) {
            $null = $pids.Add($pItem.ProcessId)
            $added = $true
        }
    }
}

$family = $allChrome | Where-Object { $pids.Contains($_.ProcessId) }
$perfData = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction SilentlyContinue

$results = @(foreach ($proc in $family) {
    $p = Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue
    $perf = $perfData | Where-Object { $_.IDProcess -eq $proc.ProcessId } | Select-Object -First 1

    $role = "browser"
    $cmd = $proc.CommandLine
    if ($cmd -match "--type=renderer") {
        $role = "renderer"
    } elseif ($cmd -match "--type=gpu-process") {
        $role = "gpu"
    } elseif ($cmd -match "--utility-sub-type=audio\.mojom\.AudioService" -or $cmd -match "audio\.mojom" -or ($cmd -match "--type=utility" -and $cmd -match "audio")) {
        $role = "audio service"
    } elseif ($cmd -match "--type=utility") {
        if ($cmd -match "--utility-sub-type=([a-zA-Z0-9_\.]+)") {
            $role = "utility ($($Matches[1]))"
        } else {
            $role = "utility"
        }
    } elseif ($cmd -match "--type=crashpad-handler") {
        $role = "crashpad"
    }

    $privBytes = if ($p) { $p.PrivateMemorySize64 } else { 0 }
    $ws = if ($p) { $p.WorkingSet64 } else { 0 }
    $privWs = if ($perf -and $perf.WorkingSetPrivate) { [int64]$perf.WorkingSetPrivate } else { $privBytes }

    [PSCustomObject]@{
        Id = $proc.ProcessId
        ParentId = $proc.ParentProcessId
        Role = $role
        PrivateBytesBytes = $privBytes
        PrivateBytesMB = [Math]::Round($privBytes / 1MB, 2)
        PrivateWorkingSetBytes = $privWs
        PrivateWorkingSetMB = [Math]::Round($privWs / 1MB, 2)
        WorkingSetBytes = $ws
        WorkingSetMB = [Math]::Round($ws / 1MB, 2)
        CommandLine = $cmd
    }
})

$results | ConvertTo-Json -Depth 4
