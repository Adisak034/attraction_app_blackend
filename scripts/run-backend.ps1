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

    # In PowerShell 7+, avoid converting native stderr log lines into PowerShell errors.
    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)
    try {
        if ($hasNativePref) {
            $originalNativePref = $PSNativeCommandUseErrorActionPreference
            $PSNativeCommandUseErrorActionPreference = $false
        }

        & $pythonExe @uvicornArgs
    }
    finally {
        if ($hasNativePref) {
            $PSNativeCommandUseErrorActionPreference = $originalNativePref
        }
    }

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
