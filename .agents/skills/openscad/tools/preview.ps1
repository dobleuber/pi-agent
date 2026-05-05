<#
.SYNOPSIS
Generate a preview PNG from an OpenSCAD file

.DESCRIPTION
Renders an OpenSCAD model to a PNG image with customizable camera position and size.

.PARAMETER InputFile
Path to the input .scad file

.PARAMETER OutputFile
Path for the output .png file

.PARAMETER Camera
Camera position as "x,y,z,rotx,roty,rotz,distance" (default: "0,0,0,55,0,25,0")

.PARAMETER Size
Image size as "WIDTHxHEIGHT" (default: "800x600")

.PARAMETER Define
Parameter definitions as "var=value" (can be specified multiple times)

.EXAMPLE
.\preview.ps1 model.scad output.png
.\preview.ps1 model.scad output.png -Camera "0,0,0,90,0,0,200" -Size "1024x768"
.\preview.ps1 model.scad output.png -Define "width=60","height=40"
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$true, Position=1)]
    [string]$OutputFile,
    
    [string]$Camera = "0,0,0,55,0,25,0",
    
    [string]$Size = "800x600",
    
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

# Convert size format from WxH to W,H
$sizeFormatted = $Size -replace 'x', ','

# Build arguments
$args = @(
    "--camera=$Camera",
    "--imgsize=$sizeFormatted",
    "--colorscheme=`"Tomorrow Night`"",
    "--autocenter",
    "--viewall"
)

# Add parameter definitions
foreach ($def in $Define) {
    $args += "-D"
    $args += $def
}

$args += "-o"
$args += "`"$OutputFile`""
$args += "`"$InputFile`""

# Ensure output directory exists
$outputDir = Split-Path -Parent $OutputFile
if ($outputDir -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "Rendering preview: $InputFile -> $OutputFile"
$argString = $args -join ' '
$process = Start-Process -FilePath $OpenSCAD -ArgumentList $argString -Wait -PassThru -NoNewWindow

if ($process.ExitCode -eq 0 -and (Test-Path $OutputFile)) {
    Write-Host "Preview saved to: $OutputFile"
} else {
    Write-Error "Failed to render preview (exit code: $($process.ExitCode))"
    exit 1
}
