---
name: openscad-cli
description: Use when working with OpenSCAD 3D CAD projects - rendering models, exporting STL/OBJ, validating scripts, or automating CAD tasks from command line
---

# OpenSCAD CLI

## Overview

Interact with OpenSCAD from command line. Render 3D models, export to various formats, validate scripts, and automate CAD workflows.

**OpenSCAD executable:** `C:\Program Files\OpenSCAD\openscad.com`

## Quick Reference

| Task | Command |
|------|---------|
| Render model | `openscad -o output.stl input.scad` |
| Export PNG | `openscad -o preview.png input.scad` |
| Validate only | `openscad --check input.scad` |
| Set variables | `openscad -D "var=value" -o out.stl in.scad` |
| View in GUI | `openscad input.scad` |

## Rendering Models

### Export to STL (3D Print)
```bash
"C:\Program Files\OpenSCAD\openscad.com" -o "model.stl" "design.scad"
```

### Export to OBJ
```bash
"C:\Program Files\OpenSCAD\openscad.com" -o "model.obj" "design.scad"
```

### Export to AMF
```bash
"C:\Program Files\OpenSCAD\openscad.com" -o "model.amf" "design.scad"
```

### Export to 3MF
```bash
"C:\Program Files\OpenSCAD\openscad.com" -o "model.3mf" "design.scad"
```

## Preview Renders (2D Images)

### PNG Preview
```bash
"C:\Program Files\OpenSCAD\openscad.com" -o "preview.png" "design.scad"
```

### SVG Preview (2D)
```bash
"C:\Program Files\OpenSCAD\openscad.com" -o "preview.svg" "design.scad"
```

### High Resolution Render
```bash
"C:\Program Files\OpenSCAD\openscad.com" --render -o "preview.png" "design.scad"
```

### Custom Camera Angle
```bash
# --camera=tx,ty,tz,rx,ry,rz,d
# tx,ty,tz = translation, rx,ry,rz = rotation, d = distance
"C:\Program Files\OpenSCAD\openscad.com" --camera=0,0,0,45,45,0,100 -o "preview.png" "design.scad"
```

### Set Image Size
```bash
"C:\Program Files\OpenSCAD\openscad.com" --imgsize 1920,1080 -o "preview.png" "design.scad"
```

## Variables from CLI

Override variables defined in the script:

```bash
# Set a single variable
"C:\Program Files\OpenSCAD\openscad.com" -D "width=50" -o "out.stl" "design.scad"

# Multiple variables
"C:\Program Files\OpenSCAD\openscad.com" -D "width=50" -D "height=100" -D "parts=4" -o "out.stl" "design.scad"
```

Useful for parametric designs:
```bash
# Generate multiple sizes
for size in 10 20 30; do
    "C:\Program Files\OpenSCAD\openscad.com" -D "size=$size" -o "model_${size}mm.stl" "parametric.scad"
done
```

## Validation

### Quiet Mode (Only Errors)
```bash
"C:\Program Files\OpenSCAD\openscad.com" -q -o "out.stl" "design.scad"
```

### Check Parameters
```bash
"C:\Program Files\OpenSCAD\openscad.com" --check-parameters=true "design.scad"
```

## Common Options

| Option | Description |
|--------|-------------|
| `-o <file>` | Output file (format determined by extension) |
| `-D "var=val"` | Set variable |
| `--render` | Full render (not preview) |
| `--camera=...` | Camera position |
| `--imgsize=W,H` | Image dimensions |
| `--colorscheme` | Color scheme for preview |
| `-q` | Quiet mode |
| `-v` | Verbose output |
| `--check` | Syntax check only |
| `--help` | Show all options |

## Color Schemes

Available color schemes for PNG export:
- `Cornfield` (default)
- `Sunset`
- `Metallic`
- `Starnight`
- `BeforeDawn`
- `Nature`
- `DeepOcean`
- `Solarized`
- `Tomorrow`
- `Tomorrow Night`
- `Monotone`

```bash
"C:\Program Files\OpenSCAD\openscad.com" --colorscheme=Nature -o "preview.png" "design.scad"
```

## Common Workflows

### Batch Export Multiple Files
```powershell
Get-ChildItem *.scad | ForEach-Object {
    $name = $_.BaseName
    & "C:\Program Files\OpenSCAD\openscad.com" -o "${name}.stl" $_.Name
}
```

### Parametric Model Generation
```powershell
# Generate bracket for different screw sizes
$sizes = @(3, 4, 5, 6, 8)
foreach ($size in $sizes) {
    & "C:\Program Files\OpenSCAD\openscad.com" `
        -D "screw_diameter=$size" `
        -o "bracket_m${size}.stl" `
        "bracket.scad"
}
```

### Render All Views
```bash
# Front
"C:\Program Files\OpenSCAD\openscad.com" --camera=0,0,0,0,0,0,200 -o "front.png" "model.scad"
# Top
"C:\Program Files\OpenSCAD\openscad.com" --camera=0,0,0,90,0,0,200 -o "top.png" "model.scad"
# Isometric
"C:\Program Files\OpenSCAD\openscad.com" --camera=0,0,0,45,45,0,200 -o "iso.png" "model.scad"
```

### Animation Frames
```powershell
# Generate animation frames
for ($i = 0; $i -lt 36; $i++) {
    $angle = $i * 10
    & "C:\Program Files\OpenSCAD\openscad.com" `
        --camera=0,0,0,45,$angle,0,200 `
        -o "frame_$($i.ToString('00')).png" `
        "model.scad"
}
```

## Include Paths

Add custom library paths:

```bash
"C:\Program Files\OpenSCAD\openscad.com" -I "C:\Users\wbert\openscad_libs" -o "out.stl" "design.scad"
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (syntax, render failure) |
| 2 | Output file could not be written |

## Common Issues

### "Can't open file"
Check the path is correct and the .scad file exists.

### Render Timeout
Complex models may take long. Use `-v` to see progress.

### Memory Issues
For very complex models, increase system memory or simplify geometry.

## Utility Scripts

Helper functions are available in the skill directory:

```
~/.agents/skills/openscad-cli/scripts/
├── openscad.ps1  # PowerShell functions
└── openscad.sh   # Bash functions
```

### Loading the Scripts

**PowerShell:**
```powershell
. "C:\Users\wbert\.agents\skills\openscad-cli\scripts\openscad.ps1"
```

**Bash:**
```bash
source ~/.agents/skills/openscad-cli/scripts/openscad.sh
```

### Available Functions

| Function | Description |
|----------|-------------|
| `oscad-render <file>` | Render to STL |
| `oscad-preview <file>` | Generate PNG preview |
| `oscad-validate <file>` | Check syntax |
| `oscad-export <file> <format>` | Export to format |
| `oscad-batch` | Render all .scad files |

### Example Usage

```powershell
# Load helpers
. "C:\Users\wbert\.agents\skills\openscad-cli\scripts\openscad.ps1"

# Render model
oscad-render "bracket.scad"

# Generate preview with custom camera
oscad-preview "bracket.scad" -Camera "0,0,0,45,45,0,150"

# Render with variable override
oscad-render "parametric.scad" -Variables @{ size = 50 }
```
