// mapPlateCarree.js
import { createSvgElement, createPathGenerator, applyCommonStyles } from './mapUtilities.js';

export function createSvg() {
    // Define the width and height of the SVG element
    const width = 400;
    const height = 300;

    // Create the SVG element
    const svg = createSvgElement('panel-1', width, height);

    // Define the projection
    const projection = d3.geoEquirectangular()
        .scale(width / (2 * Math.PI)) // scale to fit the width of the SVG
        .translate([width / 2, height / 2]); // center the map in the SVG

    // Create the path generator
    const pathGenerator = createPathGenerator(projection);

    // Define the features to include
    const featuresToInclude = new Set(['Coastline', 'Land', 'Ocean', 'sea', 'gulf', 'bay', 'River', 'Lake', 'Glacier', 'mountain', 'pass', 'depression']);

    // Load the GeoJSON data and draw the map
    d3.json("./data/world.geojson").then(data => {
        // Filter the features
        const filteredFeatures = data.features.filter(feature => featuresToInclude.has(feature.properties.featurecla));

        const path = svg.selectAll("path")
            .data(filteredFeatures)
            .enter().append("path")
            .attr("d", pathGenerator);
    
        // Apply common styles
        applyCommonStyles(path);
    });
}
