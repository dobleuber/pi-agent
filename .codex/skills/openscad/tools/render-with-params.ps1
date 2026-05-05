<#
.SYNOPSIS
Render OpenSCAD with parameters from a JSON file

.DESCRIPTION
Renders an OpenSCAD model using parameter values from a JSON configuration file.

.PARAMETER InputFile
Path to the input .scad file

.PARAMETER ParamsFile
Path to the JSON file containing parameters

.PARAMETER OutputFile
Path for the output file (.stl or .png)

.EXAMPLE
.\render-with-params.ps1 model.scad params.json output.stl
.\render-with-params.ps1 model.scad params.json preview.png

# params.json format:
# {"width": 60, "height": 40, "include_lid": true}
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile,
    
    [Parameter(Mandatory=$true, Position=1)]
    [string]$ParamsFile,
    
    [Parameter(Mandatory=$true, Position=2)]
    [string]$OutputFile
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

# Validate params file
if (-not (Test-Path $ParamsFile)) {
    Write-Error "Error: Params file not found: $ParamsFile"
    exit 1
}

# Parse JSON parameters
$params = Get-Content $ParamsFile -Raw | ConvertFrom-Json

# Build -D arguments from JSON
$defines = @()
foreach ($prop in $params.PSObject.Properties) {
    $key = $prop.Name
    $value = $prop.Value
    
    # Format value based on type
    if ($value -is [bool]) {
        $formattedValue = $value.ToString().ToLower()
    } elseif ($value -is [string]) {
        $formattedValue = "`"$value`""
    } else {
        $formattedValue = $value
    }
    
    $defines += "-D"
    $defines += "$key=$formattedValue"
}

Write-Host "Rendering with parameters from: $ParamsFile"
Write-Host "Parameters: $($defines -join ' ')"

# Determine output type and set appropriate options
$ext = [System.IO.Path]::GetExtension($OutputFile).ToLower()

$arguments = $defines

switch ($ext) {
    ".stl" {
        $arguments += "-o"
        $arguments += "`"$OutputFile`""
        $arguments += "`"$InputFile`""
    }
    ".png" {
        $arguments += "--camera=0,0,0,55,0,25,0"
        $arguments += "--imgsize=800,600"
        $arguments += "--colorscheme=`"Tomorrow Night`""
        $arguments += "--autocenter"
        $arguments += "--viewall"
        $arguments += "-o"
        $arguments += "`"$OutputFile`""
        $arguments += "`"$InputFile`""
    }
    default {
        Write-Error "Unsupported output format: $ext`nSupported: .stl, .png"
        exit 1
    }
}

# Ensure output directory exists
$outputDir = Split-Path -Parent $OutputFile
if ($outputDir -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$argString = $arguments -join ' '
$process = Start-Process -FilePath $OpenSCAD -ArgumentList $argString -Wait -PassThru -NoNewWindow

if ($process.ExitCode -eq 0 -and (Test-Path $OutputFile)) {
    Write-Host "Output saved: $OutputFile"
} else {
    Write-Error "Failed to render (exit code: $($process.ExitCode))"
    exit 1
}
