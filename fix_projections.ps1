$jsonFilePath = "C:\Users\clive\VSC\GreatCircleVisualizer\data\projections2.json"

# Read the JSON file
$jsonContent = Get-Content -Path $jsonFilePath -Raw | ConvertFrom-Json

# Create a hashtable to track projection names to avoid duplicates
$projectionNames = @{}

# Create a new array to hold the filtered and renumbered projections
$newProjections = @()

# Process each projection
foreach ($projection in $jsonContent) {
    # Skip the duplicate Boggs entry (id: 12)
    if ($projection.name -eq "Boggs" -and $projection.id -eq 12) {
        continue
    }
    
    # Add the projection to our new array
    $newProjections += $projection
}

# Renumber the IDs to be consecutive
for ($i = 0; $i -lt $newProjections.Count; $i++) {
    $newProjections[$i].id = $i + 1
}

# Convert back to JSON and save
$newJson = $newProjections | ConvertTo-Json -Depth 10
$newJson | Set-Content -Path $jsonFilePath
