# Godot CLI Helper Functions
# Source this file or add to your PowerShell profile

$GODOT_EXE = "C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe"

function godot-run {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath,
        [string]$Scene,
        [switch]$Headless,
        [switch]$Debug
    )
    
    $args = @("--path", $ProjectPath)
    
    if ($Scene) {
        $args += @("--scene", $Scene)
    }
    if ($Headless) {
        $args += "--headless"
    }
    if ($Debug) {
        $args += "--debug"
    }
    
    & $GODOT_EXE @args
}

function godot-editor {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath
    )
    
    & $GODOT_EXE --path $ProjectPath -e
}

function godot-validate {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath
    )
    
    & $GODOT_EXE --headless --check-only --path $ProjectPath 2>&1
    return $LASTEXITCODE -eq 0
}

function godot-screenshot {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath,
        [string]$Scene,
        [string]$Output = "screenshot.png",
        [int]$Width = 1920,
        [int]$Height = 1080
    )
    
    $sceneArg = if ($Scene) { $Scene } else { "" }
    
    & $GODOT_EXE --headless --path $ProjectPath -s "res://tools/quick_screenshot.gd" -- $sceneArg $Output
}

function godot-test {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath,
        [int]$QuitAfter = 3
    )
    
    & $GODOT_EXE --headless --quit-after $QuitAfter --path $ProjectPath -s "res://addons/gut/gut_cmdln.gd"
}

function godot-export {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath,
        [Parameter(Mandatory=$true)]
        [string]$Preset,
        [Parameter(Mandatory=$true)]
        [string]$Output,
        [switch]$Debug
    )
    
    $exportArg = if ($Debug) { "--export-debug" } else { "--export-release" }
    
    & $GODOT_EXE --headless --path $ProjectPath $exportArg $Preset $Output
}

function godot-import {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath
    )
    
    & $GODOT_EXE --headless --path $ProjectPath --import
}

# Project shortcuts
function godot-project {
    param(
        [string]$Name,
        [string]$BasePath = "C:\Users\wbert\projects\indies"
    )
    
    if ($Name) {
        return Join-Path $BasePath $Name
    }
    return $BasePath
}

# List scenes in a project
function godot-list-scenes {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProjectPath
    )
    
    Get-ChildItem -Path $ProjectPath -Filter "*.tscn" -Recurse | 
        Where-Object { $_.FullName -notmatch "addons" } |
        ForEach-Object { 
            $relative = $_.FullName.Replace($ProjectPath, "")
            "res:/$relative" 
        }
}

Write-Host "Godot CLI helpers loaded. Commands: godot-run, godot-editor, godot-validate, godot-screenshot, godot-test, godot-export, godot-list-scenes" -ForegroundColor Green
