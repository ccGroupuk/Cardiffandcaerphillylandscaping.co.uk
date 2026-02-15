$path = "c:\Users\jonat\OneDrive\Desktop\cardiff-landscaping\blog.html"
$content = Get-Content -Path $path -Raw
# The split might be tricky with regex special chars, so we use the literal string option if possible or just escape carefully.
# PowerShell split uses regex by default.
$parts = $content -split 'href="#"'

if ($parts.Count -eq 4) {
    # Reassemble:
    # part[0] (before 1st link) + link1 + part[1] (between 1st and 2nd) + link2 + part[2] (between 2nd and 3rd) + link3 + part[3] (remainder)
    $newContent = $parts[0] + 'href="blog-patio-maintenance.html"' + $parts[1] + 'href="blog-garden-design-trends.html"' + $parts[2] + 'href="blog-fencing-guide.html"' + $parts[3]
    Set-Content -Path $path -Value $newContent
    Write-Host "Successfully replaced links."
} else {
    Write-Host "Error: Expected 3 placeholders (4 parts), found $($parts.Count) parts."
}
