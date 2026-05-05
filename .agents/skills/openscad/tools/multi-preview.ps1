<#
.SYNOPSIS
Generate preview images from multiple angles

.DESCRIPTION
Renders an OpenSCAD model from 6 different angles: front, back, left, right, top, and isometric.

.PARAMETER InputFile
Path to the input .scad file

.PARAMETER OutputDir
Directory for the output PNG files

.PARAMETER Define
Parameter definitions as "var=value" (can be specified multiple times)

.EXAMPLE
.\multi-preview.ps1 model.scad .\previews\
.\multi-preview.ps1 model.scad .\previews\ -Define "width=60","height=40"
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$true, Position=1)]
    [string]$OutputDir,
    
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
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Get base name without extension
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($InputFile)

Write-Host "Generating multi-angle previews for: $InputFile"
Write-Host "Output directory: $OutputDir"
Write-Host ""

# Define camera angles
# Format: name -> camera (translate_x,translate_y,translate_z,rot_x,rot_y,rot_z,distance)
$angles = @{
    "iso"   = "0,0,0,55,0,25,0"
    "front" = "0,0,0,90,0,0,0"
    "back"  = "0,0,0,90,0,180,0"
    "left"  = "0,0,0,90,0,90,0"
    "right" = "0,0,0,90,0,-90,0"
    "top"   = "0,0,0,0,0,0,0"
}

foreach ($angle in $angles.GetEnumerator()) {
    $outputFile = Join-Path $OutputDir "${baseName}_$($angle.Key).png"
    
    Write-Host "  Rendering $($angle.Key) view..."
    
    $arguments = @(
        "--camera=$($angle.Value)",
        "--imgsize=800,600",
        "--colorscheme=`"Tomorrow Night`"",
        "--autocenter",
        "--viewall"
    )
    
    foreach ($def in $Define) {
        $arguments += "-D"
        $arguments += $def
    }
    
    $arguments += "-o"
    $arguments += "`"$outputFile`""
    $arguments += "`"$InputFile`""
    
    $argString = $arguments -join ' '
    $proc = Start-Process -FilePath $OpenSCAD -ArgumentList $argString -Wait -PassThru -NoNewWindow 2>$null
}

Write-Host ""
Write-Host "Generated previews:"
Get-ChildItem -Path $OutputDir -Filter "${baseName}_*.png" | ForEach-Object {
    Write-Host "  $($_.FullName)"
}
