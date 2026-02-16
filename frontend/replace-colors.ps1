# PowerShell script to replace hardcoded colors with CSS variables
# This script will update all TSX files in the components directory

$componentsPath = "d:\SalesEdge\Sales_Tools__app\frontend\src\components"

# Define color mappings: hardcoded color -> CSS variable
$colorMappings = @{
    # Primary Orange
    "'#FF6B00'" = "'var(--accent-primary)'"
    '"#FF6B00"' = '"var(--accent-primary)"'
    "background: '#FF6B00'" = "background: 'var(--accent-primary)'"
    'background: "#FF6B00"' = 'background: "var(--accent-primary)"'
    "color: '#FF6B00'" = "color: 'var(--accent-primary)'"
    'color: "#FF6B00"' = 'color: "var(--accent-primary)"'
    "borderColor: '#FF6B00'" = "borderColor: 'var(--border-accent)'"
    'borderColor: "#FF6B00"' = 'borderColor: "var(--border-accent)"'
    
    # Light Orange Accent
    "'#FFF5EB'" = "'var(--bg-accent)'"
    '"#FFF5EB"' = '"var(--bg-accent)"'
    "'#FFEDD5'" = "'var(--bg-hover)'"
    '"#FFEDD5"' = '"var(--bg-hover)"'
    
    # Light Gray Secondary
    "'#F8FAFC'" = "'var(--bg-secondary)'"
    '"#F8FAFC"' = '"var(--bg-secondary)"'
    
    # White backgrounds
    "background: 'white'" = "background: 'var(--bg-primary)'"
    'background: "white"' = 'background: "var(--bg-primary)"'
    
    # Dark text
    "'#1a1f36'" = "'var(--text-primary)'"
    '"#1a1f36"' = '"var(--text-primary)"'
    
    # Gray text
    "'#718096'" = "'var(--text-secondary)'"
    '"#718096"' = '"var(--text-secondary)"'
    "'#64748B'" = "'var(--text-tertiary)'"
    '"#64748B"' = '"var(--text-tertiary)"'
    
    # Borders
    "'#E0E6ED'" = "'var(--border-primary)'"
    '"#E0E6ED"' = '"var(--border-primary)"'
    "'#E2E8F0'" = "'var(--border-secondary)'"
    '"#E2E8F0"' = '"var(--border-secondary)"'
}

# Get all TSX files
$files = Get-ChildItem -Path $componentsPath -Filter "*.tsx" -File

Write-Host "Found $($files.Count) TSX files to process"
Write-Host "Starting color replacement..."

$updatedCount = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    $fileUpdated = $false
    
    # Apply each color mapping
    foreach ($key in $colorMappings.Keys) {
        if ($content -match [regex]::Escape($key)) {
            $content = $content -replace [regex]::Escape($key), $colorMappings[$key]
            $fileUpdated = $true
        }
    }
    
    # Only write if content changed
    if ($fileUpdated -and ($content -ne $originalContent)) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "✓ Updated: $($file.Name)"
        $updatedCount++
    }
}

Write-Host "`nCompleted! Updated $updatedCount files."
