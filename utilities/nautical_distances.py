import json
from nautical_calculations.basic import get_distance, rhumb_line

def calculate_distances(file_path):
    with open(file_path, 'r') as f:
        airport_pairs = json.load(f)

    for pair in airport_pairs:
        lat1, lon1 = pair['airportALat'], pair['airportALon']
        lat2, lon2 = pair['airportBLat'], pair['airportBLon']

        # Add a small offset to the latitude if it's exactly at the South Pole
        if lat1 == -90.0:
            lat1 += 0.0001
        if lat2 == -90.0:
            lat2 += 0.0001

        try:
            gc_distance = get_distance(lat1, lon1, lat2, lon2)
            rl_distance = rhumb_line(lat1, lon1, lat2, lon2)

            print(f"Airport Pair: {pair['airportACode']} - {pair['airportBCode']}")
            print(f"Great Circle Distance: {gc_distance} km")
            print(f"Rhumb Line Distance: {rl_distance} km")
            print()
        except ZeroDivisionError:
            print(f"Error calculating distances for airport pair: {pair['airportACode']} - {pair['airportBCode']}")
            print("This may be due to one of the airports being located at the exact North or South Pole.")
            print()
            
# Replace 'airport_pairs.json' with the path to your JSON file
calculate_distances('./data/suggestion_pairs.json')
