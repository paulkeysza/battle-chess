$ErrorActionPreference = "Stop"

$python = Get-Command python -ErrorAction SilentlyContinue

if (-not $python) {
    $knownPython = "C:\Program Files\Python314\python.exe"

    if (Test-Path -LiteralPath $knownPython) {
        $pythonExe = $knownPython
    }
    else {
        throw "Python was not found. Install Python first, or update this script with your python.exe path."
    }
}
else {
    $pythonExe = $python.Source
}

$pythonDir = Split-Path -Parent $pythonExe
$scriptsDir = Join-Path $pythonDir "Scripts"
$pathsToAdd = @($pythonDir)

if (Test-Path -LiteralPath $scriptsDir) {
    $pathsToAdd += $scriptsDir
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$existingPaths = @()

if ($userPath) {
    $existingPaths = $userPath -split ";" | Where-Object { $_ }
}

$updatedPaths = [System.Collections.Generic.List[string]]::new()
$existingPaths | ForEach-Object { $updatedPaths.Add($_) }

foreach ($path in $pathsToAdd) {
    $alreadyExists = $existingPaths | Where-Object {
        $_.TrimEnd("\") -ieq $path.TrimEnd("\")
    }

    if (-not $alreadyExists) {
        $updatedPaths.Add($path)
        Write-Host "Added: $path"
    }
    else {
        Write-Host "Already present: $path"
    }
}

[Environment]::SetEnvironmentVariable("Path", ($updatedPaths -join ";"), "User")

Write-Host ""
Write-Host "Done. Close and reopen PowerShell, then test with:"
Write-Host "python --version"
