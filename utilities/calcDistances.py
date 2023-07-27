import json
from geopy.distance import great_circle
from math import radians, sqrt, cos

# Load the data from a file
with open('./data/suggestion_pairs.json', 'r') as f:
    data = json.load(f)

# Calculate the distances
for entry in data:
    pointA = (entry["airportALat"], entry["airportALon"])
    pointB = (entry["airportBLat"], entry["airportBLon"])
    
    # Calculate the Great Circle distance
    great_circle_dist = great_circle(pointA, pointB).kilometers
    
    # Calculate the Rhumb Line distance
    R = 6371  # Radius of the Earth in kilometers
    φ1, λ1 = radians(pointA[0]), radians(pointA[1])
    φ2, λ2 = radians(pointB[0]), radians(pointB[1])
    Δφ = φ2 - φ1
    Δλ = λ2 - λ1
    φm = (φ1 + φ2) / 2
    rhumb_line_dist = R * sqrt(Δφ**2 + (cos(φm) * Δλ)**2)
    
    # Add the distances to the entry
    entry["greatCircleDist"] = round(great_circle_dist)
    entry["rhumbLineDist"] = round(rhumb_line_dist)

# Print the data with the calculated distances
print(json.dumps(data, indent=4))
