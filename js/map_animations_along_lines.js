import { 
    //haversineDistance, 
    addCity, 
    addLineAndPlane, 
    createSlider, 
    createPointSeries, 
    stopAnimationsAndClearData//, 
    //rhumbDistance, 
    //calculateRhumbLinePoints, 
    //toRad, 
    //toDeg
} from './mapUtilities.js';
import { setupProjectionDropdown, updateProjection} from './mapProjection.js';

"use strict";

console.log('Initialising map on page open/refresh...');

// Access the global instance
var globalLocationPair = window.globalLocationPair;

// create a new map object to hold the lines plotted on the maps
// The purpose of keeping a store of the line objects is so that the individual lines can hae their properties changed after they are created.
var linesMap = new Map();

// Create root element
var root = am5.Root.new("chartdiv1");

// Set themes
root.setThemes([am5themes_Animated.new(root)]);

var currentProjectionName = "geoMercator";
var chart;
var backgroundSeries;
var polygonSeries;
var graticuleSeries;
var lineSeries;
var pointSeries;
var rhumbLineSeries;
var planeSeriesArray = [];

// Get the projection function from the D3 object
let projectionFunction = d3[currentProjectionName];

function initializeMap() {
    // Update the projection and get the projection function
    updateProjection(chart, 'd3.' + currentProjectionName + '()');

    // Create series for background fill
    backgroundSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
    backgroundSeries.mapPolygons.template.setAll({
        fill: root.interfaceColors.get("alternativeBackground"),
        fillOpacity: 0,
        strokeOpacity: 0
    });

    // Add background polygon
    backgroundSeries.data.push({
        geometry: am5map.getGeoRectangle(90, 180, -90, -180)
    });

    // Call the function to create the slider
    createSlider(root, chart, backgroundSeries, projectionFunction);

    // Create main polygon series for countries
    polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow
    }));

    // graticule series
    graticuleSeries = chart.series.push(am5map.GraticuleSeries.new(root, {}));
    graticuleSeries.mapLines.template.setAll({
        stroke: root.interfaceColors.get("alternativeBackground"),
        strokeOpacity: 0.08
    });

    // Create line series for trajectory lines
    lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
    lineSeries.mapLines.template.setAll({
        stroke: root.interfaceColors.get("alternativeBackground"),
        strokeWidth: 4,
        strokeOpacity: 0.3,
        interactive: true
    });

    rhumbLineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
    rhumbLineSeries.mapLines.template.setAll({
        stroke: am5.color(0xff0000),
        strokeWidth: 2,
        strokeOpacity: 0.7
    });

    // Create point series for markers
    pointSeries = createPointSeries(root, chart);

    console.log("globalLocationPair.locationPairs: ",globalLocationPair.locationPairs)

    // Add new data
    globalLocationPair.locationPairs.forEach(pair => {
        console.log("Inside forEach Pair (body), calling addLineAndPlane.  Pair: ", pair);
        var city1 = addCity(root, chart, pointSeries, { latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName, pair.airportACode, pair.airportACountryFull);
        var city2 = addCity(root, chart, pointSeries, { latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName, pair.airportBCode, pair.airportBCountryFull);
        addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2, pair.GreatCircleDistKm, pair.RhumbLineDistKm);
    });

    // Setup projection dropdown
    setupProjectionDropdown(chart);
}

// Initialize map on page load
chart = root.container.children.push(am5map.MapChart.new(root, {
    panX: "rotateX",
    panY: "translateY",
    rotationY: 0,
    projection: am5map.geoMercator()
}));
initializeMap();

// Event listener for the 'pairExpandCollapse' event
document.addEventListener('pairExpandCollapse', function(event) {
    const { pairId, expanded } = event.detail;
    console.log(`pairExpandCollapse event listener - pairId: ${pairId}, expanded: ${expanded}`);
    // Rest of the code...
});
  

// Event listener for the "Make maps" button
document.getElementById('make-maps-button').addEventListener('click', function() {

    console.log('Make maps button clicked, reinitialising map...');
    
    // Stop animations and clear the data from each series in the planeSeriesArray
    stopAnimationsAndClearData(planeSeriesArray);

    // Clear the planeSeriesArray
    planeSeriesArray = [];

    pointSeries.data.setAll([]);
    lineSeries.data.setAll([]);

    // Ensure all references to the old chart are removed
    if (chart) {
        // Dispose of the existing chart
        chart.dispose();
    }

    // Create a new chart
    chart = root.container.children.push(am5map.MapChart.new(root, {
        panX: "rotateX",
        panY: "translateY",
        rotationY: 0,
        projection: am5map.geoMercator()
    }));

    // Re-initialize map after button click
    initializeMap();

    // Make stuff animate on load
    chart.appear(1000, 100);
});
