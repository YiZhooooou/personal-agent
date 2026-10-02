$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskExe = Join-Path $taskRoot 'Personal Agent Preview.exe'
if (-not (Test-Path -LiteralPath $taskExe)) {
    Write-Host 'Extract the complete ZIP first. Keep this script beside Personal Agent Preview.exe.'
    exit 1
}
$taskLogDir = Join-Path $taskRoot ('startup-check-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $taskLogDir | Out-Null
$env:PA_SMOKE_OUTPUT = $taskLogDir
$taskProcess = $null
try {
    Write-Host 'Checking the packaged interface with temporary test data (no login or model request)...'
    $taskProcess = Start-Process -FilePath $taskExe -ArgumentList '--smoke-test' -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskLogDir 'stdout.log') -RedirectStandardError (Join-Path $taskLogDir 'stderr.log')
    if (-not $taskProcess.WaitForExit(30000)) {
        Stop-Process -Id $taskProcess.Id -ErrorAction SilentlyContinue
        'FAIL: startup timed out after 30 seconds.' | Set-Content -LiteralPath (Join-Path $taskLogDir 'status.txt')
        Write-Host 'Startup timed out. Close any error dialog with OK.'
        exit 2
    }
    # Start-Process can expose a null ExitCode after waiting on Windows PowerShell.
    # A fresh, complete app-generated result is authoritative in that case.
    $taskExitCode = $taskProcess.ExitCode
    $taskResult = Join-Path $taskLogDir 'result.json'
    $taskPassed = $false
    if (Test-Path -LiteralPath $taskResult) {
        $taskReport = Get-Content -LiteralPath $taskResult -Raw | ConvertFrom-Json
        $taskRequired = @('renderer','isolated preload','language','theme','mode')
        $taskMissing = @($taskRequired | Where-Object { $_ -notin $taskReport.checks })
        $taskPassed = ($taskReport.passed -is [bool]) -and $taskReport.passed -and ($taskMissing.Count -eq 0)
    }
    if ($taskPassed -and ($null -eq $taskExitCode -or $taskExitCode -eq 0)) {
        'PASS: native UI, preload bridge, language, theme and mode.' | Set-Content -LiteralPath (Join-Path $taskLogDir 'status.txt')
        Write-Host 'PASS. You can now open Personal Agent Preview.exe normally.'
    } else {
        $taskExitLabel = if ($null -eq $taskExitCode) { 'unavailable; no complete successful result' } else { [string]$taskExitCode }
        ('FAIL: exit code ' + $taskExitLabel) | Set-Content -LiteralPath (Join-Path $taskLogDir 'status.txt')
        Write-Host ('Startup did not pass. Exit code: ' + $taskExitLabel)
    }
} catch {
    $_.Exception.Message | Set-Content -LiteralPath (Join-Path $taskLogDir 'status.txt')
    Write-Host ('Check failed: ' + $_.Exception.Message)
    exit 3
} finally {
    Remove-Item Env:PA_SMOKE_OUTPUT -ErrorAction SilentlyContinue
    Write-Host ('Results folder: ' + $taskLogDir)
}
