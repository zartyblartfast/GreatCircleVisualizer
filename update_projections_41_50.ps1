$jsonFilePath = "C:\Users\clive\VSC\GreatCircleVisualizer\data\projections2.json"

# Read the JSON file
$jsonContent = Get-Content -Path $jsonFilePath -Raw | ConvertFrom-Json

# Update projections 41-50 with map properties
for ($i = 40; $i -lt 50 -and $i -lt $jsonContent.Count; $i++) {
    # Add the map properties to each projection
    $jsonContent[$i] | Add-Member -NotePropertyName "rotationX" -NotePropertyValue 0 -Force
    $jsonContent[$i] | Add-Member -NotePropertyName "rotationY" -NotePropertyValue 0 -Force
    $jsonContent[$i] | Add-Member -NotePropertyName "panX" -NotePropertyValue "none" -Force
    $jsonContent[$i] | Add-Member -NotePropertyName "panY" -NotePropertyValue "none" -Force
    $jsonContent[$i] | Add-Member -NotePropertyName "wheelY" -NotePropertyValue "none" -Force
    $jsonContent[$i] | Add-Member -NotePropertyName "maxPanOut" -NotePropertyValue 0 -Force
    $jsonContent[$i] | Add-Member -NotePropertyName "allowRotation" -NotePropertyValue $false -Force
}

# Convert back to JSON and save
$newJson = $jsonContent | ConvertTo-Json -Depth 10
$newJson | Set-Content -Path $jsonFilePath
