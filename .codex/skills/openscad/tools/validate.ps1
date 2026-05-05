<#
.SYNOPSIS
Validate an OpenSCAD file for syntax errors

.DESCRIPTION
Checks an OpenSCAD file for syntax errors without full rendering.

.PARAMETER InputFile
Path to the input .scad file

.EXAMPLE
.\validate.ps1 model.scad
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile
)

$ErrorActionPreference = "Stop"

# Import common functions
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$scriptDir\common.ps1"

$OpenSCAD = Test-OpenSCAD

# Validate input file
if (-not (Test-Path $InputFile)) {
    Write-Error "Error: File not found: $InputFile"
    exit 1
}

Write-Host "Validating: $InputFile"

# Create temp file for output
$tempOutput = [System.IO.Path]::GetTempFileName() + ".echo"

try {
    # Run OpenSCAD with echo output (fastest way to check syntax)
    $result = & $OpenSCAD -o $tempOutput --export-format=echo $InputFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Syntax OK" -ForegroundColor Green
        
        # Check for echo output
        if ((Test-Path $tempOutput) -and (Get-Item $tempOutput).Length -gt 0) {
            Write-Host ""
            Write-Host "Echo output:"
            Get-Content $tempOutput
        }
        
        exit 0
    } else {
        Write-Host "✗ Validation failed" -ForegroundColor Red
        if ($result) {
            Write-Host $result
        }
        exit 1
    }
} finally {
    # Cleanup temp file
    if (Test-Path $tempOutput) {
        Remove-Item $tempOutput -Force -ErrorAction SilentlyContinue
    }
}
