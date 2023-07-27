const fs = require('fs');
const turf = require('@turf/turf');

// Read the JSON file
let data = JSON.parse(fs.readFileSync('./data/suggestion_pairs.json', 'utf8'));

// Iterate over each pair of airports
for (let pair of data) {
    const p1 = turf.point([pair.airportALon, pair.airportALat]);
    const p2 = turf.point([pair.airportBLon, pair.airportBLat]);

    // Calculate great circle distance
    const d = turf.distance(p1, p2);  // in kilometers

    // Calculate rhumb line distance
    const r = turf.rhumbDistance(p1, p2);  // in kilometers

    // Add distances to the pair object
    pair.GreatCircleDistKm = d;
    pair.RhumbLineDistKm = r;
}

// Output the data in JSON format
console.log(JSON.stringify(data, null, 2));
