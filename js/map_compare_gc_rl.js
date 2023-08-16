// map_compare_gc_rl.js 
import { 
    addCity, 
    addLineAndPlane, 
    createPointSeries, 
    calculateRhumbLinePoints, 
    addRhumbLine
} from './mapUtilities.js';


// Initial variable declarations
let suggestionPairs;           // Stores airport pair suggestions
let initializedRoots = {};     // Keeps track of initialized map roots to avoid duplication
let orthographicChart;         // Reference to the Orthographic projection map chart
let mercatorChart;             // Reference to the Mercator projection map chart
let planeSeriesArray = [];     // Array to keep track of plane series
let linesMap = new Map();      // Map to track the lines drawn on the charts
let rhumbLinePoints;           // Stores the calculated Rhumb Line points
let orthoGCLineSeries;         // Line series for Orthographic Great Circle route
let orthoRLLineSeries;         // Line series for Orthographic Rhumb Line route
let mercGCLineSeries;          // Line series for Mercator Great Circle route
let mercRLLineSeries;          // Line series for Mercator Rhumb Line route


// Populate the dropdown menu with airport pairs
function populateDropdown() {
    const selector = document.getElementById("selector");
    if (selector && suggestionPairs) {
        // Clear any existing options
        selector.innerHTML = '';
        
        // Add options based on suggestionPairs
        suggestionPairs.forEach((pair, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = pair.id; // Use 'id' property for dropdown text
            selector.appendChild(option);
        });
        
        // Call setButtonState() to ensure correct button state after populating
        setButtonState();
    }
}

// Fetch airport pair suggestions from a JSON file and filter out the pairs not meant for Rhumb Line display
async function loadSuggestionPairs() {
    //console.log("loadSuggestionPairs called");
    try {
      const response = await fetch('./data/suggestion_pairs.json');
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      suggestionPairs = await response.json();
      suggestionPairs = suggestionPairs.filter(pair => pair.RhumbLineDisplay !== false);
      //console.log("suggestionPairs:");
      //console.log(suggestionPairs);

      populateDropdown();
      
    } catch (error) {
      console.error("Failed to fetch suggestion pairs:", error);
    }
}

// Set the state of the navigation buttons based on the currently selected airport pair
function setButtonState() {

    let selector = document.getElementById("selector");
    if (selector) {
        let index = selector.selectedIndex;
        if (index == 0) {
            document.getElementById("selector-prev").disabled = "disabled";
            document.getElementById("selector-next").disabled = "";
        } else if (index >= (selector.options.length - 1)) {
            document.getElementById("selector-prev").disabled = "";
            document.getElementById("selector-next").disabled = "disabled";
        } else {
            document.getElementById("selector-prev").disabled = "";
            document.getElementById("selector-next").disabled = "";
        }
    }
}


// Configure the projection settings for a given map chart
function setProjection(chart, name) {

    chart.set("projection", d3[name]());

    if (name === 'geoOrthographic') {
        //console.log("setProjection - geoOrthographic");
        //chart.set("panX", "none");
        chart.set("panX", "rotateX");
        chart.set("panY", "rotateY");
        chart.set("rotationX", 30); //geoOG_rotationX
        chart.set("rotationY", -55); //geoOG_rotationY
        chart.set("wheelY","rotateY")
    } else if (name === 'geoMercator') {
        //console.log("setProjection - geoMercator");
        //chart.set("panX", "none");
        chart.set("panX", "rotateX");
        //chart.set("panY", "translateY");
        chart.set("panY", "none");
        chart.set("rotationX", 0);
        chart.set("rotationY", 0);
        chart.set("wheelY","none")
    } else {
        console.error("Unknown projection type:", name);
        return;
    }

    chart.goHome();

    setButtonState();
}

function ceateLegend(root, chart) {
    // Create a legend for the map
    var legend = chart.children.push(am5.Legend.new(root, {
        nameField: "name",
        fillField: "color",
        strokeField: "color",
        centerX: am5.percent(50),
        x: am5.percent(50)
    }));

    legend.data.setAll([{
        name: "Great Circle",
        color: am5.color(0xFF0000) // Red color
    }, {
        name: "Rhumb Line",
        color: am5.color(0x000000) // Black color
    }]);
}

// Initialize the map charts with specified projection and return a promise with the chart details
function createMaps(projectionType, divId) {
    return new Promise((resolve) => {
        let localRoot = am5.Root.new(divId);
        let localChart;

        am5.ready(function() {
            //console.log("am5.ready() callback executed for:", projectionType);
    
            // Check if root for this divId has already been initialized
            if (initializedRoots[divId]) {
                console.warn(`Root for ${divId} already initialized.`);
                return;
            }
        

            initializedRoots[divId] = true;  // Mark root as initialized for this divId    
    
            localChart = localRoot.container.children.push(
                am5map.MapChart.new(localRoot, {
                    panX: "none",
                    panY: projectionType === "geoOrthographic" ? "rotateY" : "translateY",
                    zoomLevel: 1.0,
                    maxZoomLevel: 1,
                    minZoomLevel: 1,
                    pinchZoomX: "none",
                    pinchZoomY: "none"
                })
            );
            
            // Set themes
            localRoot.setThemes([
                am5themes_Animated.new(localRoot)
            ]);

            // Create polygon series
            let polygonSeries = localChart.series.push(
                am5map.MapPolygonSeries.new(localRoot, {
                    geoJSON: am5geodata_worldLow
                })
            );

            let graticuleSeries = localChart.series.insertIndex(
                0, am5map.GraticuleSeries.new(localRoot, {})
            );

            graticuleSeries.mapLines.template.setAll({
                stroke: am5.color(0x000000),
                strokeOpacity: 0.1
            });

            let backgroundSeries = localChart.series.unshift(
                am5map.MapPolygonSeries.new(localRoot, {})
            );

            backgroundSeries.mapPolygons.template.setAll({
                fill: am5.color(0xedf7fa),
                stroke: am5.color(0xedf7fa),
            });

            backgroundSeries.data.push({
                geometry: am5map.getGeoRectangle(90, 180, -90, -180)
            });

            // Set projection
            setProjection(localChart, projectionType);

            let gcLineSeries = localChart.series.push(am5map.MapLineSeries.new(localRoot, { calculateDistance: true }));
            let rlLineSeries = localChart.series.push(am5map.MapLineSeries.new(localRoot, { calculateDistance: true }));

            resolve({localChart, localRoot, gcLineSeries, rlLineSeries});
        });
    });
}


// Function to create a div element for map chart and return the created div
function createMapDiv(id) {
   //console.log(`createMapDiv called with id: ${id}`);
    
    let div = document.createElement("div");
    div.id = id;
    //div.style.height = "600px"; // Set height here since it's constant

    return div;
}

// Update the routes (either Great Circle or Rhumb Line) on the map chart
function updateRoutes(root, chart, location1, location2, lineType) {

    // Check if chart is available
    if (!chart) {
        console.error("Chart object not provided to updateRoutes");
        return;
    }

    // Create the line series if they do not exist
    if (chart === orthographicChart.localChart) {
        if (!orthoGCLineSeries) {
            orthoGCLineSeries = chart.series.push(am5map.MapLineSeries.new(chart._root, { calculateDistance: true }));
        }
        if (!orthoRLLineSeries) {
            orthoRLLineSeries = chart.series.push(am5map.MapLineSeries.new(chart._root, { calculateDistance: true }));
        }
    } else if (chart === mercatorChart.localChart) {
        if (!mercGCLineSeries) {
            mercGCLineSeries = chart.series.push(am5map.MapLineSeries.new(chart._root, { calculateDistance: true }));
        }
        if (!mercRLLineSeries) {
            mercRLLineSeries = chart.series.push(am5map.MapLineSeries.new(chart._root, { calculateDistance: true }));
        }
    }

    // Apply styles depending on the lineType and the chart (either Orthographic or Mercator)
    if (lineType === "great-circle") {
        if (chart === orthographicChart.localChart) {
            orthoGCLineSeries.mapLines.template.setAll({
                stroke: am5.color(0xFF0000), // Red for Great Circle
                strokeWidth: 4
            });
        } else if (chart === mercatorChart.localChart) {
            mercGCLineSeries.mapLines.template.setAll({
                stroke: am5.color(0xFF0000), // Red for Great Circle
                strokeWidth: 4
            });
        }
    } else {
        if (chart === orthographicChart.localChart) {
            orthoRLLineSeries.mapLines.template.setAll({
                stroke: am5.color(0x000000), // Black for Rhumb Line
                strokeWidth: 4
            });
        } else if (chart === mercatorChart.localChart) {
            mercRLLineSeries.mapLines.template.setAll({
                stroke: am5.color(0x000000), // Black for Rhumb Line
                strokeWidth: 4,
                zoomStep: 0.1
            });
        }
    }
}

// Change the currently selected airport pair by a given increment (either -1 or 1)
function setIndex(increment) {
    const selector = document.getElementById("selector");
    if (selector) {
        let newIndex = selector.selectedIndex + increment;
        if (newIndex >= 0 && newIndex < selector.options.length) {
            selector.selectedIndex = newIndex;
            selector.dispatchEvent(new Event("change")); // Manually dispatch the change event to update the maps
        }
    }
    setButtonState();  // Update the Prev/Next button states based on the new dropdown index
}

// Plot the airport location on the map and return the created city marker
function plotAirportLocation(chart, location, pair) {
    if (!chart.pointSeries) {
        chart.pointSeries = createPointSeries(chart._root, chart);
    }

    let city;  

    if (location.latitude === pair.airportALat && location.longitude === pair.airportALon) {
        city = addCity(chart._root, chart, chart.pointSeries, location, pair.airportAName, pair.airportACode, pair.airportACountryFull);
    } else if (location.latitude === pair.airportBLat && location.longitude === pair.airportBLon) {
        city = addCity(chart._root, chart, chart.pointSeries, location, pair.airportBName, pair.airportBCode, pair.airportBCountryFull);
    }
    return city
}

// Clear airport locations and route lines from the map
function clearAirportLocations(chart) {
    
    if (chart.pointSeries && chart.pointSeries.data) {
        chart.pointSeries.data.setAll([]);
    }
    
    if (chart === orthographicChart.localChart) {
        if (orthoGCLineSeries) {
            orthoGCLineSeries.data.setAll([]);
        }
        if (orthoRLLineSeries) {
            orthoRLLineSeries.data.setAll([]);
        }
    } else if (chart === mercatorChart.localChart) {
        if (mercGCLineSeries) {
            mercGCLineSeries.data.setAll([]);
        }
        if (mercRLLineSeries) {
            mercRLLineSeries.data.setAll([]);
        }
    }
}

// Plot the selected airport pair on the map charts, including Great Circle and Rhumb Line routes
function plotSelectedPair(pair) {
    if (!pair) {
        console.error('Invalid airport pair provided to plotSelectedPair');
        return;
    }

    ceateLegend(orthographicChart.localRoot, orthographicChart.localChart)
    ceateLegend(mercatorChart.localRoot, mercatorChart.localChart)

    const location1 = { longitude: pair.airportALon, latitude: pair.airportALat };
    const location2 = { longitude: pair.airportBLon, latitude: pair.airportBLat };

    // Clear existing airport locations on the charts
    clearAirportLocations(orthographicChart.localChart);
    clearAirportLocations(mercatorChart.localChart);

    // Update routes on both charts for great circles
    updateRoutes(orthographicChart.localRoot, orthographicChart.localChart, location1, location2, "great-circle");
    updateRoutes(mercatorChart.localRoot, mercatorChart.localChart, location1, location2, "great-circle");

    // Plot individual airport locations on both charts

    let city1 = plotAirportLocation(orthographicChart.localChart, location1, pair);
    let city2 = plotAirportLocation(orthographicChart.localChart, location2, pair);
    plotAirportLocation(mercatorChart.localChart, location1, pair);
    plotAirportLocation(mercatorChart.localChart, location2, pair);

    addLineAndPlane(
        orthographicChart.localRoot,
        orthographicChart.localChart,
        orthoGCLineSeries, 
        null,
        planeSeriesArray,
        city1,
        city2,
        pair.GreatCircleDistKm,
        pair.RhumbLineDistKm,
        linesMap
    )

    addLineAndPlane(
        mercatorChart.localRoot,
        mercatorChart.localChart,
        mercGCLineSeries,
        null,
        planeSeriesArray,
        city1,
        city2,
        pair.GreatCircleDistKm,
        pair.RhumbLineDistKm,
        linesMap
    )
    

    rhumbLinePoints = calculateRhumbLinePoints(
        location1, location2
    );


    addRhumbLine( rhumbLinePoints, mercRLLineSeries, city1, city2, pair.GreatCircleDistKm, pair.RhumbLineDistKm)
    addRhumbLine( rhumbLinePoints, orthoRLLineSeries, city1, city2,pair.GreatCircleDistKm, pair.RhumbLineDistKm)


    updateRoutes(orthographicChart.localRoot, orthographicChart.localChart, location1, location2, "rhumb-line");
    updateRoutes(mercatorChart.localRoot, mercatorChart.localChart, location1, location2, "rhumb-line");
    
}

// Event listener to update the map when a different airport pair is selected from the dropdown
document.getElementById("selector").addEventListener("change", function () {
    const selectedIndex = this.value;
    const selectedPair = suggestionPairs[selectedIndex];

   //console.log("selectedPair: ", selectedPair)

    // Clear the planeSeriesArray
    //planeSeriesArray = [];

    //pointSeries.data.setAll([]);
    //lineSeries.data.setAll([]);
    
    // Use the new function to plot the selected pair
    plotSelectedPair(selectedPair);
});


// On document load, fetch airport pairs, initialize map charts, and plot the first airport pair
document.addEventListener("DOMContentLoaded", function () {

    if (window.hasDOMContentLoaded) {
        console.warn("DOMContentLoaded triggered more than once.");
        return;
    }
    window.hasDOMContentLoaded = true;

    // Call loadSuggestionPairs here
    loadSuggestionPairs().then(() => {
        // This block will execute after suggestionPairs is populated

        let mapContainer = document.getElementById('mapContainer');
    
        // Create a flex container div
        let flexContainer = document.createElement('div');
        flexContainer.className = 'flex-map-container';
    
        // Dynamically create divs using createMapDiv function and append them to the flex container
        let orthographicDiv = createMapDiv("chartdiv_orthographic");
        flexContainer.appendChild(orthographicDiv);

        let mercatorDiv = createMapDiv("chartdiv_mercator");
        flexContainer.appendChild(mercatorDiv);
    
        // Append the flex container to the main mapContainer
        mapContainer.appendChild(flexContainer);

        // Now, initialize the maps using the createMaps function
        Promise.all([
            createMaps("geoOrthographic", orthographicDiv.id),
            createMaps("geoMercator", mercatorDiv.id)
        ]).then(([orthoResult, mercResult]) => {
            orthographicChart = orthoResult;
            orthoGCLineSeries = orthoResult.gcLineSeries;
            orthoRLLineSeries = orthoResult.rlLineSeries;
        
            mercatorChart = mercResult;
            mercGCLineSeries = mercResult.gcLineSeries;
            mercRLLineSeries = mercResult.rlLineSeries;
        
            // Now it's safe to call plotSelectedPair
            plotSelectedPair(suggestionPairs[0]);
        });

    });
});

// Event listeners to navigate between airport pairs using the previous and next buttons
document.getElementById("selector-prev").addEventListener("click", function() {
    setIndex(-1);
});


document.getElementById("selector-next").addEventListener("click", function() {
    setIndex(1);
});
