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

// Access the global instance
var globalLocationPair = window.globalLocationPair;

// Create root element
var root = am5.Root.new("chartdiv1");

// Set themes
root.setThemes([am5themes_Animated.new(root)]);

var currentProjectionName = "geoMercator";

// Create the map chart
var chart = root.container.children.push(am5map.MapChart.new(root, {
    panX: "rotateX",
    panY: "translateY",
    rotationY: 0,
    //minWidth: 200, // minimum width in pixels
    //minHeight: 200, // minimum height in pixels
    projection: d3.geoMercator()
}));

// Update the projection and get the projection function
updateProjection(chart, 'd3.' + currentProjectionName + '()');


//global scope required for these objects
var planeSeriesArray = [];
var pointSeries;

// Create series for background fill
var backgroundSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
backgroundSeries.mapPolygons.template.setAll({
    fill: root.interfaceColors.get("alternativeBackground"),
    fillOpacity: 0,
    strokeOpacity: 0
});

// Add background polygon
backgroundSeries.data.push({
    geometry: am5map.getGeoRectangle(90, 180, -90, -180)
});

// Get the projection function from the D3 object
let projectionFunction = d3[currentProjectionName];

// Call the function to create the slider
createSlider(root, chart, backgroundSeries, projectionFunction);

// Create main polygon series for countries
var polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {
    geoJSON: am5geodata_worldLow
}));

// graticule series
var graticuleSeries = chart.series.push(am5map.GraticuleSeries.new(root, {}));
graticuleSeries.mapLines.template.setAll({
    stroke: root.interfaceColors.get("alternativeBackground"),
    strokeOpacity: 0.08
});


// Create line series for trajectory lines
var lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
lineSeries.mapLines.template.setAll({
    stroke: root.interfaceColors.get("alternativeBackground"),
    strokeWidth: 4,
    strokeOpacity: 0.3,
    interactive: true
 });


let rhumbLineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
rhumbLineSeries.mapLines.template.setAll({
    stroke: am5.color(0xff0000),
    strokeWidth: 2,
    strokeOpacity: 0.7
});

// Create point series for markers
pointSeries = createPointSeries(root, chart);

globalLocationPair.locationPairs.forEach(pair => {
    //console.log("Inside forEach Pair (body), calling addLineAndPlane.  Pair: ", pair)
    var city1 = addCity(root, chart, pointSeries,{ latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName, pair.airportACode, pair.airportACountryFull);
   
    //console.log("Inside forEach Pair (body). Pair.airportAName: ", pair.airportAName)
    //console.log("Inside forEach Pair (body). Pair.countryA: ", pair.countryA)

    var city2 = addCity(root, chart, pointSeries, { latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName, pair.airportBCode, pair.airportBCountryFull);

    //console.log("Inside forEach Pair (body). Pair.airportBName: ", pair.airportBName)

    //console.log("City1 object: ", city1);
    //console.log("City2 object: ", city2);

    addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2, pair.GreatCircleDistKm, pair.RhumbLineDistKm);

});

// Event listener for the "Make maps" button
document.getElementById('make-maps-button').addEventListener('click', function() {

    //console.log("globalLocationPair after make-maps-button click: ", globalLocationPair)

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
        chart = null;
        backgroundSeries = null;
        polygonSeries = null;
        graticuleSeries = null;
        lineSeries = null;
        pointSeries = null;
    }

    // Create a new chart
    chart = root.container.children.push(am5map.MapChart.new(root, {
        panX: "rotateX",
        panY: "translateY",
        rotationY: 0,
        //minWidth: 200, // minimum width in pixels
        //minHeight: 200, // minimum height in pixels
        projection: am5map.geoMercator()
    }));

    // Call the function to create the slider again
    createSlider(root, chart, backgroundSeries, projectionFunction);

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
        interactive: true//,
    });

    // Create point series for markers
    pointSeries = createPointSeries(root, chart);

    // Add new data
    globalLocationPair.locationPairs.forEach(pair => {


        //console.log("Inside forEach Pair (click function), calling addLineAndPlane.  Pair: ", pair)
        //console.log("GreatCircleDistKm >>>>>", pair.GreatCircleDistKm)
        //console.log("RhumbLineDistKm >>>>>", pair.RhumbLineDistKm)

        var city1 = addCity(root, chart, pointSeries, { latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName, pair.airportACode, pair.airportACountry);

        //console.log("Inside forEach Pair (click function). Pair.airportAName: ", pair.airportAName)

        var city2 = addCity(root, chart, pointSeries, { latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName, pair.airportBCode, pair.airportBCountry);
        //console.log("Inside forEach Pair (click function). Pair.airportBName: ", pair.airportBName)

        //console.log("City1 object: ", city1);
        //console.log("City2 object: ", city2);
        //console.log("distances: ", city1.)

        addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2, pair.GreatCircleDistKm, pair.RhumbLineDistKm);

    });

    // Call the function to set up the dropdown again
    setupProjectionDropdown(chart);
    
    // Make stuff animate on load
    chart.appear(1000, 100);
});

setupProjectionDropdown(chart);




