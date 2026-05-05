#!/bin/bash
# Godot CLI Helper Functions
# Source this file: source godot.sh

GODOT_EXE="C:\\Users\\wbert\\Godot\\Godot_v4.6-stable_win64_console.exe"

# Run a Godot project
godot-run() {
    local project_path="$1"
    local scene="$2"
    local headless=""
    local debug=""
    
    shift 2 2>/dev/null || true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --headless) headless="--headless" ;;
            --debug) debug="--debug" ;;
        esac
        shift
    done
    
    local args=("--path" "$project_path")
    [[ -n "$scene" ]] && args+=("--scene" "$scene")
    [[ -n "$headless" ]] && args+=("$headless")
    [[ -n "$debug" ]] && args+=("$debug")
    
    "$GODOT_EXE" "${args[@]}"
}

# Open Godot editor
godot-editor() {
    local project_path="$1"
    "$GODOT_EXE" --path "$project_path" -e
}

# Validate project (check for errors)
godot-validate() {
    local project_path="$1"
    "$GODOT_EXE" --headless --check-only --path "$project_path" 2>&1
    return $?
}

# Capture screenshot
godot-screenshot() {
    local project_path="$1"
    local scene="$2"
    local output="${3:-screenshot.png}"
    
    "$GODOT_EXE" --headless --path "$project_path" -s "res://tools/quick_screenshot.gd" -- "$scene" "$output"
}

# Run tests with GUT
godot-test() {
    local project_path="$1"
    local quit_after="${2:-3}"
    
    "$GODOT_EXE" --headless --quit-after "$quit_after" --path "$project_path" -s "res://addons/gut/gut_cmdln.gd"
}

# Export build
godot-export() {
    local project_path="$1"
    local preset="$2"
    local output="$3"
    local export_type="--export-release"
    
    if [[ "$4" == "--debug" ]]; then
        export_type="--export-debug"
    fi
    
    "$GODOT_EXE" --headless --path "$project_path" "$export_type" "$preset" "$output"
}

# Import resources
godot-import() {
    local project_path="$1"
    "$GODOT_EXE" --headless --path "$project_path" --import
}

# List scenes in a project
godot-list-scenes() {
    local project_path="$1"
    find "$project_path" -name "*.tscn" -type f | grep -v addons | while read -r file; do
        local relative="${file#$project_path}"
        echo "res://$relative"
    done
}

echo "Godot CLI helpers loaded. Commands: godot-run, godot-editor, godot-validate, godot-screenshot, godot-test, godot-export, godot-list-scenes"
