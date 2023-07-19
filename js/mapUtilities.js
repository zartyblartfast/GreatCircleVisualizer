// mapUtilities.js

export function createSvgElement(containerId, width, height) {
    return d3.select(`#${containerId}`) // select the div with the provided id
        .append("svg") // append an svg element to the div
        .attr("width", width) // set the width of the svg
        .attr("height", height); // set the height of the svg
}

export function createPathGenerator(projection) {
    return d3.geoPath().projection(projection);
}

export function applyCommonStyles(path) {
    path.attr("fill", "#008000") // Green
        .attr("stroke", "#000000"); // Black
}
