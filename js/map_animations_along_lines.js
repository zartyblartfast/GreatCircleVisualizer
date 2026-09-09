import { 
    addCity, 
    addLineAndPlane, 
    createPointSeries, 
    stopAnimationsAndClearData,
} from './mapUtilities.js';
import { setupProjectionDropdown, updateProjection, currentProjectionName } from './mapProjection.js';
import { loadProjectionConfig, applyProjectionConfig, applyOrthographic } from './projectionConfig.js';
import { initCorridorSeries, showCorridor, hideCorridor } from './corridorRenderer.js';
import { recordMainChartCreated, recordMainChartDisposed } from './mapDiagnostics.js';

"use strict";

// Access the global instance
var globalLocationPair = window.globalLocationPair;

// create a new map object to hold the lines plotted on the maps
// The purpose of keeping a store of the line objects is so that the individual lines can hae their properties changed after they are created.
var linesMap = new Map();
//console.log('1. linesMap:', linesMap);

// A root owns amCharts' canvas layers and private projection state. Projection
// changes recreate it so no fit/translation state can leak into the next map.
var root;

function createRoot() {
    root = am5.Root.new("chartdiv1");
    root.setThemes([am5themes_Animated.new(root)]);
}

createRoot();

var chart;
var backgroundSeries;
var polygonSeries;
var graticuleSeries;
var lineSeries;
var pointSeries;
var rhumbLineSeries;
var planeSeriesArray = [];

function initializeMap(useGlobeProjection = false) {
    // Create the target projection before map geometry exists. This avoids an
    // intermediate D3 projection whose fit state could affect the globe.
    if (useGlobeProjection) {
        applyOrthographic(chart);
    } else {
        updateProjection(chart, currentProjectionName);
    }

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

    // Globe toggle is now an HTML element (see index.html #globe-toggle)
    // Canvas-based createSlider removed for Brave browser compatibility


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
        strokeWidth: 6,
        strokeOpacity: 0.3,
        interactive: true,
        cursorOverStyle: "pointer"
    });
    lineSeries.mapLines.template.set("tooltip", am5.Tooltip.new(root, {}));

    // Create point series for markers
    pointSeries = createPointSeries(root, chart);

    // Add new data
    globalLocationPair.locationPairs.forEach(pair => {
        //console.log("Inside forEach Pair (body), calling addLineAndPlane.  Pair: ", pair);
        var city1 = addCity(root, chart, pointSeries, { latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName, pair.airportACode, pair.airportACountryFull);
        var city2 = addCity(root, chart, pointSeries, { latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName, pair.airportBCode, pair.airportBCountryFull);
        
        // Calling addLineAndPlane and storing the returned line reference
        var lineReference = addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2, pair.GreatCircleDistKm, pair.RhumbLineDistKm, linesMap);

        // Storing the line reference in linesMap using pair.id as the key
        linesMap.set(pair.id, lineReference);
    });

    //console.log("linesMap: ",linesMap)
    // Create corridor line series (for median flight path overlay)
    initCorridorSeries(root, chart);

}

// Start loading projection config without blocking event listener registration.
// The startup suggestions module clicks the update button after loading suggestions;
// this listener must already exist by then, even if projection config is still loading.
const projectionConfigReady = loadProjectionConfig();

async function createMainChart(useGlobeProjection = false) {
    await projectionConfigReady;

    chart = root.container.children.push(am5map.MapChart.new(root, {
        panX: "rotateX",
        panY: "translateY",
        rotationY: 0,
        projection: am5map.geoEqualEarth(),
        minZoomLevel: 1.0,
        maxZoomLevel: 1.25
    }));
    recordMainChartCreated(chart);
    initializeMap(useGlobeProjection);
}

function getExpandedPairId() {
    return document.querySelector('.tag.expanded')?.id || null;
}

function restoreExpandedPair(pairId) {
    if (!pairId) return;
    document.dispatchEvent(new CustomEvent('pairExpandCollapse', {
        detail: { pairId, expanded: true }
    }));
}

async function recreateMainChart(useGlobeProjection) {
    const expandedPairId = getExpandedPairId();
    stopAnimationsAndClearData(planeSeriesArray);
    planeSeriesArray = [];
    if (chart) recordMainChartDisposed(chart);
    chart = null;
    linesMap.clear();
    root.dispose();
    document.getElementById('chartdiv1').replaceChildren();
    createRoot();
    await createMainChart(useGlobeProjection);
    restoreExpandedPair(expandedPairId);
}

async function rebuildMainChartForProjection() {
    if (!chart) return;
    await recreateMainChart(false);
    chart.appear(300, 0);
}

// Bind once. Chart roots are recreated, but this DOM control is not.
setupProjectionDropdown(null, rebuildMainChartForProjection);

// --- HTML Globe Toggle ---
var globeToggle = document.getElementById('globe-toggle');
var globeToggleLabel = document.getElementById('globe-toggle-label');
globeToggle.addEventListener('change', async function() {
    if (!chart) return;
    var projectionSelect = document.getElementById('projectionSelect');
    if (globeToggle.checked) {
        // Build the globe on a fresh root so the preceding D3 projection cannot
        // leak its fit/translation state into the orthographic chart.
        await recreateMainChart(true);
        globeToggle.checked = true;
        globeToggleLabel.textContent = 'Globe';
        projectionSelect.disabled = true;
    } else {
        // Build a fresh map root; do not mutate the orthographic chart.
        globeToggleLabel.textContent = 'Map';
        await recreateMainChart(false);
        projectionSelect.disabled = false;
    }
});

document.addEventListener('pairExpandCollapse', function(event) {
    const { pairId, expanded } = event.detail;
    const lineReference = linesMap.get(pairId);

    if (lineReference && lineReference._settings && lineReference._settings.mapLine) {
        //console.log('Found lineReference:', lineReference);

        if (expanded) {
            lineReference._settings.mapLine.set("stroke", am5.color("#FF0000"));
            lineReference._settings.mapLine.set("strokeWidth", 7);
            lineReference._settings.mapLine.set("strokeOpacity", 0.5);
            // Only fetch corridors for pairs that have corridor data
            const pair = globalLocationPair.locationPairs.find(p => p.id === pairId);
            if (pair && pair.corridor && pair.corridor.available) {
                showCorridor(pairId);
            }
        } else {
            lineReference._settings.mapLine.set("stroke", am5.color("#000000"));
            lineReference._settings.mapLine.set("strokeWidth", 6);
            lineReference._settings.mapLine.set("strokeOpacity", 0.3);
            hideCorridor();
        }
        
        // Update chart to reflect changes
        //chart.invalidateLayout();

    } else {
        console.warn(`Line reference not found for pairId: ${pairId}`);
    }
});


// Event listener for the "Make maps" button
document.getElementById('make-maps-button').addEventListener('click', async function() {

    //console.log('Make maps button clicked, reinitialising map...');
    
    var projectionSelect = document.getElementById('projectionSelect'); // Assuming the ID of the dropdown element is 'projectionSelect'
    projectionSelect.disabled = false; // Enable the dropdown

    // Reset globe toggle to Map mode
    document.getElementById('globe-toggle').checked = false;
    document.getElementById('globe-toggle-label').textContent = 'Map';

    // Stop animations and clear the data from each series in the planeSeriesArray
    stopAnimationsAndClearData(planeSeriesArray);

    // Clear the planeSeriesArray
    planeSeriesArray = [];

    // Dispose the old chart only when the user explicitly updates routes after
    // an existing chart has been created. On startup this is the sole creation.
    if (chart) {
        chart.dispose();
        recordMainChartDisposed(chart);
        chart = null;
    }
    linesMap.clear();

    await createMainChart();

    // Make stuff animate on load
    chart.appear(1000, 100);
});

document.addEventListener('DOMContentLoaded', function() {
    // Select all elements with the 'button-info-icon' class
    const buttonIcons = document.querySelectorAll('.button-info-icon');
  
    // Add a click event listener to each icon
    buttonIcons.forEach(function(icon) {
      icon.addEventListener('click', function(event) {
        // Stop the event from bubbling up and triggering the button's click event
        event.stopPropagation();
      });
    });
  });
  