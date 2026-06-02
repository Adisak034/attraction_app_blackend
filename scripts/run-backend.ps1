#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [ValidateSet("development", "production")]
    [string]$Environment = "production",

    [string]$BindHost = "0.0.0.0",

    [int]$Port = 8000,

    [int]$Workers = 2,

    [string]$PythonCommand = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendPath = Join-Path $projectRoot "backend"

if (-not (Test-Path $backendPath)) {
    throw "Backend directory not found: $backendPath"
}

function Resolve-PythonExecutable {
    param(
        [string]$Root,
        [string]$Backend,
        [string]$Override
    )

    if ($Override -and $Override.Trim().Length -gt 0) {
        return $Override
    }

    $candidates = @(
        (Join-Path $Root ".venv/Scripts/python.exe"),
        (Join-Path $Root ".venv/bin/python"),
        (Join-Path $Backend ".venv/Scripts/python.exe"),
        (Join-Path $Backend ".venv/bin/python")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $python3 = Get-Command python3 -ErrorAction SilentlyContinue
    if ($null -ne $python3) {
        return "python3"
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($null -ne $python) {
        return "python"
    }

    throw "Python not found. Install Python or provide -PythonCommand."
}

$pythonExe = Resolve-PythonExecutable -Root $projectRoot -Backend $backendPath -Override $PythonCommand

Push-Location $backendPath
try {
    # Ensure DB and other env vars from backend/.env are loaded by python-dotenv in app code.
    $env:PYTHONUNBUFFERED = "1"

    $uvicornArgs = @(
        "-m", "uvicorn", "app.main:app",
        "--host", $BindHost,
        "--port", $Port.ToString()
    )

    if ($Environment -eq "development") {
        $uvicornArgs += "--reload"
    }
    else {
        if ($Workers -lt 1) {
            throw "-Workers must be at least 1."
        }
        $uvicornArgs += @("--workers", $Workers.ToString())
    }

    Write-Host "Starting backend with: $pythonExe $($uvicornArgs -join ' ')"
    Write-Host ""

    # Redirect stderr to stdout so PowerShell doesn't treat Uvicorn logs as errors
    # Uvicorn is a long-running process, so Ctrl+C exit codes are expected and normal
    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)
    $originalErrorAction = $ErrorActionPreference
    try {
        if ($hasNativePref) {
            $originalNativePref = $PSNativeCommandUseErrorActionPreference
            $PSNativeCommandUseErrorActionPreference = $false
        }
        $ErrorActionPreference = 'Continue'

        # Redirect stderr (2) to stdout (1) to prevent PowerShell error wrapping
        & $pythonExe @uvicornArgs 2>&1 | Write-Host
    }
    finally {
        $ErrorActionPreference = $originalErrorAction
        if ($hasNativePref) {
            $PSNativeCommandUseErrorActionPreference = $originalNativePref
        }
    }

    # Uvicorn exits with non-zero when stopped (Ctrl+C), which is expected
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 130) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
