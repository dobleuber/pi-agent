#!/bin/bash
# OpenSCAD CLI Helper Functions
# Source this file: source openscad.sh

OPENSCAD_EXE="C:\\Program Files\\OpenSCAD\\openscad.com"

# Render SCAD file to STL
oscad-render() {
    local file="$1"
    local output="${2:-}"
    shift 2 2>/dev/null || true
    
    if [[ ! -f "$file" ]]; then
        echo "Error: File not found: $file" >&2
        return 1
    fi
    
    # Default output to same name with .stl extension
    if [[ -z "$output" ]]; then
        local base="${file%.scad}"
        output="${base}.stl"
    fi
    
    # Parse variable overrides
    local vars=()
    while [[ $# -gt 0 ]]; do
        case $1 in
            -D=*|--var=*)
                vars+=("-D" "${1#*=}")
                ;;
        esac
        shift
    done
    
    echo "Rendering: $file -> $output"
    "$OPENSCAD_EXE" -o "$output" "${vars[@]}" "$file"
    
    if [[ $? -eq 0 ]]; then
        echo "Done: $output"
    fi
}

# Generate PNG preview
oscad-preview() {
    local file="$1"
    local output="${2:-}"
    local camera="${3:-}"
    local width="${4:-1920}"
    local height="${5:-1080}"
    
    if [[ ! -f "$file" ]]; then
        echo "Error: File not found: $file" >&2
        return 1
    fi
    
    # Default output
    if [[ -z "$output" ]]; then
        local base="${file%.scad}"
        output="${base}.png"
    fi
    
    local args=("-o" "$output" "--imgsize=${width},${height}")
    
    if [[ -n "$camera" ]]; then
        args+=("--camera=$camera")
    fi
    
    args+=("$file")
    
    echo "Preview: $file -> $output"
    "$OPENSCAD_EXE" "${args[@]}"
}

# Validate SCAD syntax
oscad-validate() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        echo "Error: File not found: $file" >&2
        return 1
    fi
    
    local result
    result=$("$OPENSCAD_EXE" --check "$file" 2>&1)
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo "Valid: $file"
        return 0
    else
        echo "Invalid: $file"
        echo "$result"
        return 1
    fi
}

# Export to specific format
oscad-export() {
    local file="$1"
    local format="$2"
    local output="${3:-}"
    
    if [[ ! -f "$file" ]]; then
        echo "Error: File not found: $file" >&2
        return 1
    fi
    
    # Default output
    if [[ -z "$output" ]]; then
        local base="${file%.scad}"
        output="${base}.${format}"
    fi
    
    echo "Exporting: $file -> $output"
    "$OPENSCAD_EXE" -o "$output" "$file"
}

# Batch render all SCAD files in directory
oscad-batch() {
    local path="${1:-.}"
    local format="${2:-stl}"
    
    local count=$(find "$path" -name "*.scad" -type f | wc -l)
    echo "Found $count .scad files"
    
    find "$path" -name "*.scad" -type f | while read -r file; do
        local base="${file%.scad}"
        local output="${base}.${format}"
        echo "Processing: $file"
        "$OPENSCAD_EXE" -o "$output" "$file"
    done
    
    echo "Batch complete!"
}

# Show model info
oscad-info() {
    local file="$1"
    "$OPENSCAD_EXE" --info "$file"
}

echo "OpenSCAD CLI helpers loaded. Commands: oscad-render, oscad-preview, oscad-validate, oscad-export, oscad-batch, oscad-info"
