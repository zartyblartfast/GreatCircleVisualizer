import os
import json

# Directory containing your GeoJSON files
#directory = os.path.join(os.pardir, 'ne_10m_physical')
directory = 'C:\\Users\\clive\\Downloads\\110m_physical'

# Initialize an empty GeoJSON feature collection
merged = {
    'type': 'FeatureCollection',
    'features': []
}

# Loop through the GeoJSON files
for filename in os.listdir(directory):
    if filename.endswith('.geojson'):
        # Open the GeoJSON file
        # Open the GeoJSON file
        with open(os.path.join(directory, filename), 'r', encoding='utf-8') as f:
            geojson = json.load(f)

        # Add the features to the merged feature collection
        merged['features'] += geojson['features']

# Write the merged feature collection to a new file
#with open('world.geojson', 'w') as f:
#    json.dump(merged, f)
# Write the combined GeoJSON data to a new file
with open('combined.geojson', 'w') as f:
    json.dump(merged, f, indent=4)

