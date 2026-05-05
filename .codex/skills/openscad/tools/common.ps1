# Common utilities for OpenSCAD tools (Windows)

function Find-OpenSCAD {
    <#
    .SYNOPSIS
    Find the OpenSCAD executable on Windows
    #>
    
    # Check if openscad is in PATH
    $inPath = Get-Command openscad -ErrorAction SilentlyContinue
    if ($inPath) {
        return $inPath.Source
    }
    
    # Common installation paths on Windows
    $commonPaths = @(
        "$env:ProgramFiles\OpenSCAD\openscad.exe",
        "${env:ProgramFiles(x86)}\OpenSCAD\openscad.exe",
        "$env:LOCALAPPDATA\Programs\OpenSCAD\openscad.exe",
        "$env:USERPROFILE\scoop\apps\openscad\current\openscad.exe",
        "C:\Program Files\OpenSCAD\openscad.exe",
        "C:\Program Files (x86)\OpenSCAD\openscad.exe"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    # Try to find via registry (installed via MSI)
    try {
        $regPath = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\openscad.exe" -ErrorAction SilentlyContinue
        if ($regPath -and (Test-Path $regPath.'(default)')) {
            return $regPath.'(default)'
        }
    } catch {}
    
    return $null
}

function Test-OpenSCAD {
    <#
    .SYNOPSIS
    Check if OpenSCAD is available and return its path
    #>
    
    $script:OpenSCAD = Find-OpenSCAD
    
    if (-not $script:OpenSCAD) {
        Write-Error @"
Error: OpenSCAD not found!

Install OpenSCAD using one of:
  - Download from https://openscad.org/downloads.html
  - winget install OpenSCAD.OpenSCAD
  - scoop install openscad
  - choco install openscad
"@
        exit 1
    }
    
    return $script:OpenSCAD
}

function Get-OpenSCADVersion {
    <#
    .SYNOPSIS
    Get the installed OpenSCAD version
    #>
    
    $openscad = Test-OpenSCAD
    & $openscad --version 2>&1
}
