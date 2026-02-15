$oldDomain = "cardifflandscapers.co.uk"
$newDomain = "cardiffandcaerphillylandscaping.co.uk"
$capitalizedOld = "cardiffLandscapers.com"

# Get all HTML and XML files
$files = Get-ChildItem -Path "c:\Users\jonat\OneDrive\Desktop\cardiff-landscaping" -Include *.html,*.xml -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace [regex]::Escape($oldDomain), $newDomain
    $newContent = $newContent -replace [regex]::Escape($capitalizedOld), $newDomain
    $newContent = $newContent -replace [regex]::Escape("https://cardiffLandscapers.com"), ("https://" + $newDomain)
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        Write-Host "Updated $($file.Name)"
    }
}
