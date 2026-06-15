$applicationsFolder = Join-Path $PSScriptRoot "applications"

$files = Get-ChildItem $applicationsFolder -Filter "*.csv" |
    Select-Object -ExpandProperty Name

$files |
    ConvertTo-Json |
    Set-Content (Join-Path $applicationsFolder "index.json")

Write-Host "index.json updated with $($files.Count) CSV files"