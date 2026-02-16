# PowerShell script to apply the Autumn Theme
# Replaces hardcoded hex colors with CSS variables

$targetDir = "d:\SalesEdge\Sales_Tools__app\frontend\src"

# Color mappings
$mappings = @(
    # Brand Colors
    @{ Original = "#FF6B00"; Replacement = "var(--theme-primary)" },
    @{ Original = "#1a1f36"; Replacement = "var(--ae-navy)" },
    @{ Original = "#0066CC"; Replacement = "var(--ae-blue)" },
    
    # Text & Semantic
    @{ Original = "#718096"; Replacement = "var(--text-secondary)" },
    @{ Original = "#64748B"; Replacement = "var(--text-tertiary)" },
    @{ Original = "#2D3748"; Replacement = "var(--ae-gray-800)" },
    
    # Backgrounds & Borders
    @{ Original = "#F5F7FA"; Replacement = "var(--ae-gray-50)" },
    @{ Original = "#F8FAFC"; Replacement = "var(--bg-secondary)" },
    @{ Original = "#E0E6ED"; Replacement = "var(--border-primary)" },
    @{ Original = "#E2E8F0"; Replacement = "var(--border-secondary)" },
    @{ Original = "#FFF5EB"; Replacement = "var(--bg-accent)" },
    @{ Original = "#FFEDD5"; Replacement = "var(--bg-hover)" }
)

$files = Get-ChildItem -Path $targetDir -Include *.tsx,*.ts -Recurse

foreach ($file in $files) {
    if ($file.Name -eq "vite-env.d.ts") { continue }
    
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    $modified = $false

    foreach ($map in $mappings) {
        if ($content.Contains($map.Original)) {
            $content = $content.Replace($map.Original, $map.Replacement)
            $modified = $true
        }
    }

    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
