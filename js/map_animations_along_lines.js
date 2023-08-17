import { 
    //haversineDistance, 
    addCity, 
    addLineAndPlane, 
    createSlider, 
    createPointSeries, 
    stopAnimationsAndClearData,
    //addPlaneAnimation,
    //removePlaneAnimation
    //rhumbDistance, 
    //calculateRhumbLinePoints, 
    //toRad, 
    //toDeg
} from './mapUtilities.js';
import { setupProjectionDropdown, updateProjection} from './mapProjection.js';

"use strict";


//console.log("Inside map_animations_along_lines.js")

//console.log('Initialising map on page open/refresh...');

// Access the global instance
var globalLocationPair = window.globalLocationPair;

// create a new map object to hold the lines plotted on the maps
// The purpose of keeping a store of the line objects is so that the individual lines can hae their properties changed after they are created.
var linesMap = new Map();
//console.log('1. linesMap:', linesMap);

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
    //console.log("Inside initializeMap()")
    // Update the projection and get the projection function
    updateProjection(chart, 'd3.' + currentProjectionName + '()');
    //console.log("Projection updated to:", currentProjectionName);

    // Create series for background fill
    /*
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
    */
    var backgroundSeries = chart.series.unshift(
        am5map.MapPolygonSeries.new(root, {})
      );
      //console.log("Background series created:", backgroundSeries);


      backgroundSeries.mapPolygons.template.setAll({
        fill: am5.color(0xedf7fa),
        stroke: am5.color(0xedf7fa),
      });
    
      backgroundSeries.data.push({
        geometry: am5map.getGeoRectangle(90, 180, -90, -180)
      });

    // Call the function to create the slider
    createSlider(root, chart, backgroundSeries, projectionFunction);

    // Call the function to creat the zoom reset button.
    //createZoomResetButton(root, chart)


    // Create main polygon series for countries
    polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow
    }));
    //console.log("Polygon series count:", chart.series.length);
    //console.log("Main polygon series added:", polygonSeries);


    // graticule series
    graticuleSeries = chart.series.push(am5map.GraticuleSeries.new(root, {}));
    graticuleSeries.mapLines.template.setAll({
        stroke: root.interfaceColors.get("alternativeBackground"),
        strokeOpacity: 0.08
    });
    //console.log("Graticule series added:", graticuleSeries);

    // Create line series for trajectory lines
    lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
    lineSeries.mapLines.template.setAll({
        stroke: root.interfaceColors.get("alternativeBackground"),
        strokeWidth: 4,
        strokeOpacity: 0.3,
        interactive: true
    });
    //console.log("Line series added:", lineSeries);

    /*
    rhumbLineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
    rhumbLineSeries.mapLines.template.setAll({
        stroke: am5.color(0xff0000),
        strokeWidth: 2,
        strokeOpacity: 0.7
    });
    */

    // Create point series for markers
    pointSeries = createPointSeries(root, chart);

    //console.log("globalLocationPair.locationPairs: ",globalLocationPair.locationPairs)

    // Add new data
    globalLocationPair.locationPairs.forEach(pair => {
        //console.log("Inside forEach Pair (body), calling addLineAndPlane.  Pair: ", pair);
        var city1 = addCity(root, chart, pointSeries, { latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName, pair.airportACode, pair.airportACountryFull);
        var city2 = addCity(root, chart, pointSeries, { latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName, pair.airportBCode, pair.airportBCountryFull);
        
        // Calling addLineAndPlane and storing the returned line reference
        var lineReference = addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2, pair.GreatCircleDistKm, pair.RhumbLineDistKm, linesMap);

        //console.log('Line reference returned from addLineAndPlane:', lineReference);

        // Storing the line reference in linesMap using pair.id as the key
        linesMap.set(pair.id, lineReference);
    });

    //console.log("linesMap: ",linesMap)
    // Setup projection dropdown
    setupProjectionDropdown(chart);
}

// Initialize map on page load
chart = root.container.children.push(am5map.MapChart.new(root, {
    //panX: "rotateX",
    panX: "none",
    //panY: "translateY",
    panY: "none",
    rotationY: 0,
    projection: am5map.geoMercator(),
    minZoomLevel: 1.0,
    maxZoomLevel: 1.25
}));

//console.log("Chart after initialization:", chart);


initializeMap();


document.addEventListener('pairExpandCollapse', function(event) {
    const { pairId, expanded } = event.detail;
    const lineReference = linesMap.get(pairId);

    if (lineReference && lineReference._settings && lineReference._settings.mapLine) {
        //console.log('Found lineReference:', lineReference);

        if (expanded) {
            lineReference._settings.mapLine.set("stroke", am5.color("#FF0000"));
            lineReference._settings.mapLine.set("strokeWidth", 5);
            lineReference._settings.mapLine.set("strokeOpacity", 0.5);
        } else {
            lineReference._settings.mapLine.set("stroke", am5.color("#000000"));
            lineReference._settings.mapLine.set("strokeWidth", 4);
            lineReference._settings.mapLine.set("strokeOpacity", 0.3);
        }
        
        // Update chart to reflect changes
        //chart.invalidateLayout();

    } else {
        console.warn(`Line reference not found for pairId: ${pairId}`);
    }
});


// Event listener for the "Make maps" button
document.getElementById('make-maps-button').addEventListener('click', function() {

    //console.log('Make maps button clicked, reinitialising map...');
    
    var projectionSelect = document.getElementById('projectionSelect'); // Assuming the ID of the dropdown element is 'projectionSelect'
    projectionSelect.disabled = false; // Enable the dropdown

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
        //panX: "rotateX",
        panX: "none",
        //panY: "translateY",
        panY: "none",
        rotationY: 0,
        projection: am5map.geoMercator(),
        minZoomLevel: 1.0,
        maxZoomLevel: 1.5
    }));
    
    //console.log("Chart after initialization (2):", chart);

    // Re-initialize map after button click
    initializeMap();

    // Make stuff animate on load
    chart.appear(1000, 100);
});

