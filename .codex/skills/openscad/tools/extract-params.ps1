<#
.SYNOPSIS
Extract customizable parameters from an OpenSCAD file

.DESCRIPTION
Parses parameter declarations with special comments:
  param = value;           // [min:max] Description
  param = value;           // [min:step:max] Description  
  param = value;           // [opt1, opt2] Description
  param = value;           // Description only

.PARAMETER InputFile
Path to the input .scad file

.PARAMETER Json
Output in JSON format

.EXAMPLE
.\extract-params.ps1 model.scad
.\extract-params.ps1 model.scad -Json
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$InputFile,
    
    [switch]$Json
)

$ErrorActionPreference = "Stop"

# Validate input file
if (-not (Test-Path $InputFile)) {
    Write-Error "Error: File not found: $InputFile"
    exit 1
}

function Extract-Parameters {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $lines = $content -split "`n"
    
    $blockDepth = 0
    $parameters = @()
    
    foreach ($line in $lines) {
        # Track block depth (skip params inside modules/functions)
        $blockDepth += ($line.ToCharArray() | Where-Object { $_ -eq '{' }).Count
        $blockDepth -= ($line.ToCharArray() | Where-Object { $_ -eq '}' }).Count
        
        if ($blockDepth -gt 0) {
            continue
        }
        
        # Match: varname = value; // comment
        if ($line -match '^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);\s*(?://\s*(.*))?$') {
            $varName = $Matches[1]
            $value = $Matches[2].Trim()
            $comment = if ($Matches[3]) { $Matches[3] } else { "" }
            
            # Determine type
            $varType = switch -Regex ($value) {
                '^(true|false)$' { "boolean"; break }
                '^-?\d+$' { "integer"; break }
                '^-?\d*\.?\d+$' { "number"; break }
                '^".*"$' { "string"; break }
                '^\[' { "array"; break }
                default { "expression" }
            }
            
            # Remove quotes from string values
            if ($varType -eq "string") {
                $value = $value.Trim('"')
            }
            
            # Parse comment for range/options
            $range = ""
            $options = ""
            $description = $comment
            
            if ($comment -match '^\[([^\]]+)\]\s*(.*)$') {
                $bracketContent = $Matches[1]
                $description = $Matches[2]
                
                # Check if numeric range (contains :) or options (contains ,)
                if ($bracketContent -match ':' -and $bracketContent -notmatch ',') {
                    $range = $bracketContent
                } else {
                    $options = $bracketContent
                }
            }
            
            $parameters += [PSCustomObject]@{
                Name = $varName
                Value = $value
                Type = $varType
                Range = $range
                Options = $options
                Description = $description
            }
        }
    }
    
    return $parameters
}

$params = Extract-Parameters -FilePath $InputFile

if ($Json) {
    $jsonOutput = $params | ForEach-Object {
        $obj = @{
            name = $_.Name
            value = $_.Value
            type = $_.Type
        }
        if ($_.Range) { $obj.range = $_.Range }
        if ($_.Options) { $obj.options = $_.Options }
        if ($_.Description) { $obj.description = $_.Description }
        $obj
    }
    $jsonOutput | ConvertTo-Json -Depth 10
} else {
    Write-Host "Parameters in: $InputFile"
    Write-Host "==============================================="
    Write-Host ("{0,-20} {1,-15} {2,-10} {3}" -f "NAME", "VALUE", "TYPE", "CONSTRAINT/DESC")
    Write-Host "-----------------------------------------------"
    
    foreach ($p in $params) {
        $constraint = ""
        if ($p.Range) {
            $constraint = "[$($p.Range)]"
        } elseif ($p.Options) {
            $constraint = "[$($p.Options)]"
        }
        if ($p.Description) {
            if ($constraint) {
                $constraint = "$constraint $($p.Description)"
            } else {
                $constraint = $p.Description
            }
        }
        
        Write-Host ("{0,-20} {1,-15} {2,-10} {3}" -f $p.Name, $p.Value, $p.Type, $constraint)
    }
}
