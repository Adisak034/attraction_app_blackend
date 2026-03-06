#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [ValidateSet("development", "production")]
    [string]$Environment = "production",

    [string]$BindHost = "0.0.0.0",

    [int]$Port = 0,

    [switch]$InstallDependencies,

    [string]$NpmCommand = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageJsonPath = Join-Path $projectRoot "package.json"

if (-not (Test-Path $packageJsonPath)) {
    throw "package.json not found in project root: $projectRoot"
}

function Resolve-NpmExecutable {
    param([string]$Override)

    if ($Override -and $Override.Trim().Length -gt 0) {
        return $Override
    }

    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($null -ne $npm) {
        return "npm"
    }

    throw "npm not found. Install Node.js/npm or provide -NpmCommand."
}

$npmExe = Resolve-NpmExecutable -Override $NpmCommand

if ($Port -le 0) {
    if ($Environment -eq "development") {
        $Port = 5173
    }
    else {
        $Port = 4173
    }
}

Push-Location $projectRoot
try {
    # Optional dependency installation for first-time setup or fresh server.
    if ($InstallDependencies.IsPresent) {
        if (Test-Path (Join-Path $projectRoot "package-lock.json")) {
            & $npmExe ci
        }
        else {
            & $npmExe install
        }

        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }

    # In PowerShell 7+, avoid converting native stderr lines into PowerShell errors.
    $hasNativePref = $null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)
    try {
        if ($hasNativePref) {
            $originalNativePref = $PSNativeCommandUseErrorActionPreference
            $PSNativeCommandUseErrorActionPreference = $false
        }

        if ($Environment -eq "development") {
            Write-Host "Starting frontend in development mode on $BindHost`:$Port"
            & $npmExe run dev -- --host $BindHost --port $Port
        }
        else {
            Write-Host "Building frontend..."
            & $npmExe run build
            if ($LASTEXITCODE -ne 0) {
                exit $LASTEXITCODE
            }

            Write-Host "Starting frontend in preview mode on $BindHost`:$Port"
            & $npmExe run preview -- --host $BindHost --port $Port
        }
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
