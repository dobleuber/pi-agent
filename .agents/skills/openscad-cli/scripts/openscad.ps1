# OpenSCAD CLI Helper Functions
# Source this file or add to your PowerShell profile

$OPENSCAD_EXE = "C:\Program Files\OpenSCAD\openscad.com"

function oscad-render {
    param(
        [Parameter(Mandatory=$true)]
        [string]$File,
        [string]$Output,
        [hashtable]$Variables
    )
    
    if (-not (Test-Path $File)) {
        Write-Error "File not found: $File"
        return
    }
    
    # Determine output file
    if (-not $Output) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($File)
        $dir = Split-Path $File -Parent
        $Output = Join-Path $dir "$base.stl"
    }
    
    $args = @("-o", $Output)
    
    # Add variables
    if ($Variables) {
        foreach ($key in $Variables.Keys) {
            $args += @("-D", "$key=$($Variables[$key])")
        }
    }
    
    $args += $File
    
    Write-Host "Rendering: $File -> $Output" -ForegroundColor Cyan
    & $OPENSCAD_EXE @args
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Done: $Output" -ForegroundColor Green
    }
}

function oscad-preview {
    param(
        [Parameter(Mandatory=$true)]
        [string]$File,
        [string]$Output,
        [string]$Camera,
        [string]$ColorScheme = "Nature",
        [int]$Width = 1920,
        [int]$Height = 1080
    )
    
    if (-not (Test-Path $File)) {
        Write-Error "File not found: $File"
        return
    }
    
    # Determine output file
    if (-not $Output) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($File)
        $dir = Split-Path $File -Parent
        $Output = Join-Path $dir "$base.png"
    }
    
    $args = @(
        "-o", $Output,
        "--imgsize=${Width},${Height}",
        "--colorscheme=$ColorScheme"
    )
    
    if ($Camera) {
        $args += "--camera=$Camera"
    }
    
    $args += $File
    
    Write-Host "Preview: $File -> $Output" -ForegroundColor Cyan
    & $OPENSCAD_EXE @args
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Done: $Output" -ForegroundColor Green
    }
}

function oscad-validate {
    param(
        [Parameter(Mandatory=$true)]
        [string]$File
    )
    
    if (-not (Test-Path $File)) {
        Write-Error "File not found: $File"
        return $false
    }
    
    $result = & $OPENSCAD_EXE --check $File 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "Valid: $File" -ForegroundColor Green
        return $true
    } else {
        Write-Host "Invalid: $File" -ForegroundColor Red
        Write-Host $result
        return $false
    }
}

function oscad-export {
    param(
        [Parameter(Mandatory=$true)]
        [string]$File,
        [Parameter(Mandatory=$true)]
        [ValidateSet("stl", "obj", "amf", "3mf", "png", "svg")]
        [string]$Format,
        [string]$Output
    )
    
    if (-not (Test-Path $File)) {
        Write-Error "File not found: $File"
        return
    }
    
    # Determine output file
    if (-not $Output) {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($File)
        $dir = Split-Path $File -Parent
        $Output = Join-Path $dir "$base.$Format"
    }
    
    & $OPENSCAD_EXE -o $Output $File
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Exported: $Output" -ForegroundColor Green
    }
}

function oscad-batch {
    param(
        [string]$Path = ".",
        [string]$Format = "stl"
    )
    
    $files = Get-ChildItem -Path $Path -Filter "*.scad" -Recurse
    
    Write-Host "Found $($files.Count) .scad files" -ForegroundColor Cyan
    
    foreach ($file in $files) {
        $output = Join-Path $file.Directory "$($file.BaseName).$Format"
        Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
        & $OPENSCAD_EXE -o $output $file.FullName
    }
    
    Write-Host "Batch complete!" -ForegroundColor Green
}

function oscad-info {
    param(
        [Parameter(Mandatory=$true)]
        [string]$File
    )
    
    & $OPENSCAD_EXE --info $File
}

Write-Host "OpenSCAD CLI helpers loaded. Commands: oscad-render, oscad-preview, oscad-validate, oscad-export, oscad-batch, oscad-info" -ForegroundColor Green
