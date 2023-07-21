import { 
    haversineDistance, 
    addCity, 
    addLineAndPlane, 
    createSlider, 
    createPointSeries, 
    stopAnimationsAndClearData, 
    rhumbDistance, 
    calculateRhumbLinePoints, 
    toRad, 
    toDeg,
    updateProjection
} from './mapUtilities.js';


"use strict";

// Access the global instance
var globalLocationPair = window.globalLocationPair;

// Create root element
var root = am5.Root.new("chartdiv1");

// Set themes
root.setThemes([am5themes_Animated.new(root)]);

// Create the map chart
var chart = root.container.children.push(am5map.MapChart.new(root, {
    panX: "rotateX",
    panY: "translateY", // Changed from "rotateY" to "translateY"
    rotationY: 0,
    //projection: am5map.geoMercator()
    projection: d3.geoMercator()
}));

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

// Call the function when the page is loaded
// Call createSlider and pass backgroundSeries as an argument
createSlider(root, chart, backgroundSeries);

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
    strokeOpacity: 0.3
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
    console.log("Inside forEach Pair (body), calling addLineAndPlane.  Pair: ", pair)
    var city1 = addCity(root, chart, pointSeries,{ latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName, pair.airportACode, pair.airportACountry);
   
    console.log("Inside forEach Pair (body). Pair.airportAName: ", pair.airportAName)
    console.log("Inside forEach Pair (body). Pair.countryA: ", pair.countryA)

    var city2 = addCity(root, chart, pointSeries, { latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName, pair.airportBCode, pair.airportBCountry);

    console.log("Inside forEach Pair (body). Pair.airportBName: ", pair.airportBName)

    console.log("City1 object: ", city1);
    console.log("City2 object: ", city2);

    addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2);

});

// Event listener for the "Make maps" button
document.getElementById('make-maps-button').addEventListener('click', function() {

    console.log("globalLocationPair after make-maps-button click: ", globalLocationPair)

    // Stop animations and clear the data from each series in the planeSeriesArray
    /*
    for (let i = 0; i < planeSeriesArray.length; i++) {
        let planeSeries = planeSeriesArray[i];
        for (let j = 0; j < planeSeries.dataItems.length; j++) {
            let dataItem = planeSeries.dataItems[j];
            if (dataItem.bullet) {
                let sprite = dataItem.bullet.get("sprite");
                if (sprite && sprite.animations) {
                    sprite.animations.each(function(animation) {
                        animation.stop();
                    });
                }
            }
        }
    planeSeries.data.setAll([]);
    }
    */
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
        panY: "rotateY",
        projection: am5map.geoMercator()
    }));

    // Call the function to create the slider
    createSlider(root, chart);

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
        strokeOpacity: 0.3
    });

    // Create point series for markers
    pointSeries = createPointSeries(root, chart);

    // Add new data
    globalLocationPair.locationPairs.forEach(pair => {
        console.log("Inside forEach Pair (click function), calling addLineAndPlane.  Pair: ", pair)
        var city1 = addCity(root, chart, pointSeries, { latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName, pair.airportACode, pair.airportACountry);

        console.log("Inside forEach Pair (click function). Pair.airportAName: ", pair.airportAName)

        var city2 = addCity(root, chart, pointSeries, { latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName, pair.airportBCode, pair.airportBCountry);
        console.log("Inside forEach Pair (click function). Pair.airportBName: ", pair.airportBName)

        console.log("City1 object: ", city1);
        console.log("City2 object: ", city2);

        addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2);

    });

    // Make stuff animate on load
    chart.appear(1000, 100);
});
// Event listener for the projection dropdown
var projectionSelect = document.getElementById('projectionSelect');

// Fetch the JSON data from the file
fetch('./data/projections.json')
    .then(response => response.json())
    .then(data => {
        // Loop through the data and create an option for each item
        for (var i = 0; i < data.length; i++) {
            var option = document.createElement("option");
            option.text = data[i].name;
            option.value = data[i].projection;

            // Set the default selection to "geoMercator"
            if (data[i].projection === 'd3.geoMercator()') {
                option.selected = true;
            }

            projectionSelect.add(option);
        }
    })
    .catch(error => console.error('Error:', error));

projectionSelect.addEventListener('change', function() {
    const selectedProjection = projectionSelect.value;
    updateProjection(chart, selectedProjection); // Update the map projection
});





