<#
.SYNOPSIS
Export OpenSCAD file to STL

.DESCRIPTION
Renders an OpenSCAD model to STL format for 3D printing.

.PARAMETER InputFile
Path to the input .scad file

.PARAMETER OutputFile
Path for the output .stl file

.PARAMETER Define
Parameter definitions as "var=value" (can be specified multiple times)

.EXAMPLE
.\export-stl.ps1 box.scad box.stl
.\export-stl.ps1 box.scad box_large.stl -Define "width=80","height=60"
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$true, Position=1)]
    [string]$OutputFile,
    
    [string[]]$Define = @()
)

$ErrorActionPreference = "Stop"

# Import common functions
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$scriptDir\common.ps1"

$OpenSCAD = Test-OpenSCAD

# Validate input file
if (-not (Test-Path $InputFile)) {
    Write-Error "Error: Input file not found: $InputFile"
    exit 1
}

# Ensure output directory exists
$outputDir = Split-Path -Parent $OutputFile
if ($outputDir -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Build arguments
$arguments = @()

foreach ($def in $Define) {
    $arguments += "-D"
    $arguments += $def
}

$arguments += "-o"
$arguments += "`"$OutputFile`""
$arguments += "`"$InputFile`""

Write-Host "Exporting STL: $InputFile -> $OutputFile"
if ($Define.Count -gt 0) {
    Write-Host "Parameters: $($Define -join ', ')"
}

$argString = $arguments -join ' '
$process = Start-Process -FilePath $OpenSCAD -ArgumentList $argString -Wait -PassThru -NoNewWindow

if ($process.ExitCode -eq 0 -and (Test-Path $OutputFile)) {
    $fileInfo = Get-Item $OutputFile
    $size = "{0:N2} KB" -f ($fileInfo.Length / 1KB)
    Write-Host "STL exported: $OutputFile ($size)"
} else {
    Write-Error "Failed to export STL (exit code: $($process.ExitCode))"
    exit 1
}
