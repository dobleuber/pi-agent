---
name: godot-cli
description: Use when working with Godot game engine projects - running games, executing tests, capturing screenshots, validating builds, or automating Godot tasks from command line
---

# Godot CLI

## Overview

Interact with Godot 4.x engine from command line. Run games, execute tests, capture screenshots, and validate builds without opening the editor.

**Godot executable:** `C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe`

## Quick Reference

| Task | Command |
|------|---------|
| Run project | `godot-run <project_path>` |
| Run scene | `godot-run <project_path> --scene <scene.tscn>` |
| Open editor | `godot-editor <project_path>` |
| Headless run | `godot-run <project_path> --headless` |
| Validate only | `godot-run <project_path> --check-only` |
| Screenshot | `godot-screenshot <project_path> --scene <scene.tscn> --output <file.png>` |
| Run tests | `godot-test <project_path>` |
| Export build | `godot-export <project_path> --preset <name> --output <path>` |

## Prerequisites

The skill assumes Godot 4.x is installed. The executable path is configured above.

For testing, the project should have [GUT (Godot Unit Testing)](https://github.com/bitwes/Gut) installed or a similar testing framework.

## Running Games

### Basic Run
```bash
# Run the main scene of a project
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --path "C:\path\to\project"
```

### Run Specific Scene
```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --path "C:\path\to\project" --scene "res://scenes/main.tscn"
```

### Headless Mode (No Graphics)
Useful for CI/CD or server environments:
```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project"
```

### Validate Project (Check for Errors)
Parse the project for errors without running:
```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --check-only --path "C:\path\to\project"
```

### Debug Options
```bash
# Enable debug mode with collision visualization
godot-run <project_path> --debug --debug-collisions

# Show navigation debug visuals
godot-run <project_path> --debug --debug-navigation

# Print FPS to console
godot-run <project_path> --print-fps
```

## Capturing Screenshots

**Note:** CLI screenshot capture has limitations. The most reliable method is capturing from within the running game.

### Method 1: In-Game Screenshot (Recommended)
Add a screenshot function to your game code:

```gdscript
func _input(event):
    if event is InputEventKey and event.keycode == KEY_F12 and event.pressed:
        var image = get_viewport().get_texture().get_image()
        var filename = "screenshot_%d.png" % Time.get_ticks_msec()
        image.save_png("user://" + filename)
        print("Saved: %s" % filename)
```

Run the game normally and press F12 to capture.

### Method 2: Movie Writer (CLI)
Godot 4 can record frames using `--write-movie`:

```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --path "C:\path\to\project" --write-movie "output.png" --fixed-fps 10 --quit-after 60
```

This creates `output00000000.png`, `output00000001.png`, etc.

**Limitations:**
- Requires the scene to render correctly in CLI context
- May produce blank frames depending on scene setup
- Creates a .wav file for audio (can be deleted)

## Running Tests

### With GUT (Godot Unit Testing)
If the project uses GUT:

```bash
# Run GUT tests headless (with quit-after to ensure exit)
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --quit-after 2 --path "C:\path\to\project" -s "res://addons/gut/gut_cmdln.gd"

# Run with verbose output
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --quit-after 2 --path "C:\path\to\project" -s "res://addons/gut/gut_cmdln.gd" -v
```

**Important:** Use `--quit-after N` to ensure Godot exits after tests complete. GUT runs tests in the first frame, so `--quit-after 2` gives enough time for test completion before exit.

### With Custom Test Runner
```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project" -s "res://tests/run_tests.gd"
```

Example test runner `run_tests.gd`:
```gdscript
extends SceneTree

var passed = 0
var failed = 0

func _init():
    print("Running tests...")
    await _run_all_tests()
    _print_results()
    quit(0 if failed == 0 else 1)

func _run_all_tests():
    # Load and run test scripts
    var test_files = ["res://tests/test_player.gd", "res://tests/test_game.gd"]
    for file in test_files:
        var test_script = load(file).new()
        for method in test_script.get_script_method_list():
            if method.name.begins_with("test_"):
                var result = await test_script.call(method.name)
                if result:
                    passed += 1
                else:
                    failed += 1

func _print_results():
    print("=== Test Results ===")
    print("Passed: %d" % passed)
    print("Failed: %d" % failed)
```

## Exporting Builds

### List Export Presets
Check `export_presets.cfg` in the project root for available presets.

### Export Release Build
```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project" --export-release "Windows Desktop" "builds/game.exe"
```

### Export Debug Build
```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project" --export-debug "Windows Desktop" "builds/game_debug.exe"
```

### Import Resources First
Before exporting, ensure resources are imported:
```bash
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project" --import
```

## Common Workflows

### Validate and Run Tests (CI Pipeline)
```bash
# 1. Check for parsing errors
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --check-only --path "C:\path\to\project"
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Run tests
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project" -s "res://addons/gut/gut_cmdln.gd"
if ($LASTEXITCODE -ne 0) { exit 1 }

# 3. Export build
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project" --export-release "Windows Desktop" "builds/game.exe"
```

### Quick Validation
```bash
# Fast syntax and resource check
"C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --check-only --path "C:\path\to\project"
```

### Screenshot Multiple Scenes
```bash
# Create a batch script to capture multiple scenes
$scenes = @("main", "menu", "level1")
foreach ($scene in $scenes) {
    "C:\Users\wbert\Godot\Godot_v4.6-stable_win64_console.exe" --headless --path "C:\path\to\project" --scene "res://scenes/$scene.tscn" --write-movie "screenshots/$scene.png" --fixed-fps 1 --quit-after 1
}
```

## Viewing Logs

Godot stores logs in the user data directory:

```
%APPDATA%\Godot\app_userdata\<ProjectName>\logs\
```

### Log Files

| File | Description |
|------|-------------|
| `godot.log` | Most recent session log |
| `godot2026-03-17T12.38.33.log` | Timestamped logs from previous sessions |

### Viewing Logs

```powershell
# View latest log
cat "$env:APPDATA\Godot\app_userdata\YourProject\logs\godot.log"

# Tail log in real-time (while game runs)
Get-Content "$env:APPDATA\Godot\app_userdata\YourProject\logs\godot.log" -Wait

# List all logs
ls "$env:APPDATA\Godot\app_userdata\YourProject\logs\"
```

### Viewing Errors Only

```powershell
# Filter for errors and warnings
Select-String -Path "$env:APPDATA\Godot\app_userdata\YourProject\logs\godot.log" -Pattern "ERROR|WARNING"
```

### In-Game Logging

Use `print()`, `push_warning()`, and `push_error()` in GDScript to write to logs:

```gdscript
print("Debug info: ", some_value)
push_warning("Something unexpected happened")
push_error("Critical failure!")
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (check output) |
| Non-zero | Failure (validation, test, export error) |

## Common Issues

### "Project not found"
Ensure the path contains `project.godot` file. Use `--path` to specify the project directory.

### Headless Rendering Issues
For operations that need rendering but no display (screenshots), use:
```bash
--display-driver windows --rendering-driver opengl3
```
Or run with display but auto-quit:
```bash
--quit-after 1
```

### Test Framework Not Found
Install GUT via Asset Library or download from: https://github.com/bitwes/Gut

## Debug Flags Reference

| Flag | Purpose |
|------|---------|
| `--debug` | Enable debug mode |
| `--debug-collisions` | Show collision shapes |
| `--debug-navigation` | Show navigation polygons |
| `--debug-paths` | Show path lines |
| `--profiling` | Enable script profiling |
| `--gpu-validation` | Validate graphics API calls |
| `--verbose` | Verbose output |
| `-v` | Verbose mode (alternative) |

## Utility Scripts

PowerShell and Bash helper scripts are available in the skill directory:

```
~/.agents/skills/godot-cli/scripts/
├── godot.ps1  # PowerShell functions
└── godot.sh   # Bash functions
```

### Loading the Scripts

**PowerShell:**
```powershell
# Add to your $PROFILE or source directly
. "C:\Users\wbert\.agents\skills\godot-cli\scripts\godot.ps1"
```

**Bash:**
```bash
# Add to ~/.bashrc or source directly
source ~/.agents/skills/godot-cli/scripts/godot.sh
```

### Available Functions

| Function | Description |
|----------|-------------|
| `godot-run <path>` | Run a project |
| `godot-editor <path>` | Open editor |
| `godot-validate <path>` | Validate project |
| `godot-screenshot <path> [scene] [output]` | Capture screenshot |
| `godot-test <path>` | Run GUT tests |
| `godot-export <path> <preset> <output>` | Export build |
| `godot-list-scenes <path>` | List all scenes |

### Example Usage

```powershell
# Load helpers
. "C:\Users\wbert\.agents\skills\godot-cli\scripts\godot.ps1"

# Run your project
godot-run "C:\Users\wbert\projects\indies\mind-frame-frontier"

# Validate
if (godot-validate "C:\path\to\project") {
    Write-Host "Project is valid!"
}

# List scenes
godot-list-scenes "C:\path\to\project"

# Capture screenshot
godot-screenshot "C:\path\to\project" "res://scenes/main.tscn" "screenshot.png"
```
