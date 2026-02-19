// mapUtilities.js
//import { currentProjectionName } from './mapProjection.js';
import { currentProjectionName, updateProjection } from './mapProjection.js';
import { applyProjectionConfig, applyOrthographic } from './projectionConfig.js';

export function addCity(root, chart, pointSeries, coords, title, code, country) {

    //console.log("inside addCity: ",code)

    var dataItem = pointSeries.pushDataItem({
        latitude: coords.latitude,
        longitude: coords.longitude,
        airportName: title,
        code: code,
        country: country
    });
    dataItem.tooltipText = "{airportName} ({code})\nCountry: {country}\nLatitude: {latitude}\nLongitude: {longitude}";
    return dataItem;
}

export function addLineAndPlane(root, chart, lineSeries, rhumbLineSeries, planeSeriesArray, city1, city2, GreatCircleDistKm, RhumbLineDistKm, linesMap) {
    
    /*
    console.log("Inside addLineAndPlane. City1.airportAName: ", city1.get("airportName"))
    console.log("Inside addLineAndPlane. City1.latitude: ", city1.get("latitude"))
    console.log("Inside addLineAndPlane. City1.longitude: ", city1.get("longitude"))
    console.log("Inside addLineAndPlane. City2.airportAName: ", city2.get("airportName"))
    console.log("Inside addLineAndPlane. City2.latitude: ", city2.get("latitude"))
    console.log("Inside addLineAndPlane. City2.longitude: ", city2.get("longitude"))
    */
    //console.log("Inside addLineAndPlane, GreatCircleDistKm: ", GreatCircleDistKm)
    //console.log("Inside addLineAndPlane, RhumbLineDistKm: ", RhumbLineDistKm)

    // Calculate the percentage difference
    let percentageDifference = ((RhumbLineDistKm - GreatCircleDistKm) / GreatCircleDistKm) * 100;

    // Include the sign in the percentage difference
    let signedPercentageDifference;
    if (Math.abs(percentageDifference) < 0.005) { // If the absolute value of the percentage difference is less than 0.005
        signedPercentageDifference = '~0';
    } else {
        signedPercentageDifference = percentageDifference > 0 ? `+${percentageDifference.toFixed(2)}` : percentageDifference.toFixed(2);
    }
  
    var lineDataItem = lineSeries.pushDataItem({
        id: city1.get("code") + "-" + city2.get("code"), // Create a unique ID using airport codes
        pointsToConnect: [city1, city2],
        airportAName: city1.get("airportName"),
        airportACode: city1.get("code"),
        airportBName: city2.get("airportName"),
        airportBCode: city2.get("code"),
        GreatCircleDistKm: Number(GreatCircleDistKm).toFixed(1),
        RhumbLineDistKm: Number(RhumbLineDistKm).toFixed(1),
        PercentageDifference: signedPercentageDifference
    });

    //lineSeries.mapLines.template.set("tooltipText", "{airportAName} ({airportACode}) to {airportBName} ({airportBCode})\nGreat Circle Distance: {GreatCircleDistKm} km\nRhumb Line Distance: {RhumbLineDistKm} km ({PercentageDifference}%)");
    lineSeries.mapLines.template.set("tooltipText", 
    "[bold]Great Circle[/]\n{airportAName} ({airportACode}) to {airportBName} ({airportBCode})\nGreat Circle Distance: {GreatCircleDistKm} km\nRhumb Line Distance: {RhumbLineDistKm} km ({PercentageDifference}%)");

    //console.log('2. linesMap:', linesMap);
    linesMap.set(city1.get("code") + "-" + city2.get("code"), lineDataItem);

/*
    var planeSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
    planeSeriesArray.push(planeSeries);  // Add the new planeSeries to the array

    var plane = am5.Graphics.new(root, {
        svgPath: "m2,106h28l24,30h72l-44,-133h35l80,132h98c21,0 21,34 0,34l-98,0 -80,134h-35l43,-133h-71l-24,30h-28l15,-47",
        scale: 0.06,
        centerY: am5.p50,
        centerX: am5.p50,
        fill: am5.color(0x000000)
    });

    planeSeries.bullets.push(function () {
        var container = am5.Container.new(root, {});
        container.children.push(plane);
        return am5.Bullet.new(root, { sprite: container });
    });

    var planeDataItem = planeSeries.pushDataItem({
        lineDataItem: lineDataItem,
        positionOnLine: 0,
        autoRotate: true
    });

    planeDataItem.animate({
        key: "positionOnLine",
        to: 1,
        duration: 10000,
        loops: Infinity,
        easing: am5.ease.yoyo(am5.ease.linear)
    });

    planeDataItem.on("positionOnLine", function (value) {
        //console.log("Updating position for plane from " + city1.airportName + " to " + city2.airportName);
        if (value >= 0.99) {
            plane.set("rotation", 180);
        }
        else if (value <= 0.01) {
            plane.set("rotation", 0);
        }
    });
*/
    return lineDataItem; // Return the line's unique ID
}

export function createSlider(root, chart, backgroundSeries, projectionFunction) {

    //console.log("inside createSlider()")
    var cont = chart.children.push(am5.Container.new(root, {
        layout: root.horizontalLayout,
        x: 20,
        y: 40
    }));

    var labelMap = cont.children.push(am5.Label.new(root, {
        centerY: am5.p50,
        text: "Map"
    }));

    var labelGlobe = cont.children.push(am5.Label.new(root, {
        centerY: am5.p50,
        text: "Globe",
        visible: false
    }));

    var switchButton = cont.children.push(am5.Button.new(root, {
        themeTags: ["switch"],
        centerY: am5.p50,
        icon: am5.Circle.new(root, {
            themeTags: ["icon"]
        })
    }));

    // Save the initial projection object for restore when toggling back from globe
    var savedProjection = chart.get("projection");

    switchButton.on("active", function() {
        var projectionSelect = document.getElementById('projectionSelect');
        if (!switchButton.get("active")) {
            // --- Switching BACK to Map mode ---
            labelMap.set("visible", true);
            labelGlobe.set("visible", false);

            // Restore projection via unified config (full state reset)
            applyProjectionConfig(chart, currentProjectionName);

            projectionSelect.disabled = false;
        } else {
            // --- Switching TO Globe mode ---
            labelMap.set("visible", false);
            labelGlobe.set("visible", true);

            // Save current projection object before switching
            savedProjection = chart.get("projection");

            // Apply orthographic via unified config
            applyOrthographic(chart);

            projectionSelect.disabled = true;
        }
    });
    
}


export function createPointSeries(root, chart) {
    var pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
    pointSeries.bullets.push(function () {
        var circle = am5.Circle.new(root, {
            radius: 7,
            cursorOverStyle: "pointer",
            tooltipY: 0,
            fill: am5.color(0xffba00),
            stroke: root.interfaceColors.get("background"),
            strokeWidth: 2,
            draggable: false
        });
        circle.events.on("dragged", function (event) {
            var dataItem = event.target.dataItem;
            var projection = chart.get("projection");
            var geoPoint = chart.invert({ x: circle.x(), y: circle.y() });
            dataItem.setAll({
                longitude: geoPoint.longitude,
                latitude: geoPoint.latitude
            });
        });
        circle.set("tooltipText", "{airportName} ({code})\nCountry: {country}\nLatitude: {latitude}\nLongitude: {longitude}");
        return am5.Bullet.new(root, {
            sprite: circle
        });
    });
    return pointSeries;
}

export function stopAnimationsAndClearData(planeSeriesArray) {
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
}

// Functions to calculate Rhumb Line points
export function toRad(x) {
return x * Math.PI / 180;
}

export function toDeg(x) {
return x * 180 / Math.PI;
}

export function calculateRhumbLinePoints(start, end, numPoints = 100) {
    let points = [];
    let lat1 = toRad(start.latitude);
    let lon1 = toRad(start.longitude);
    let lat2 = toRad(end.latitude);
    let lon2 = toRad(end.longitude);

    let dLon = lon2 - lon1;
    let dPhi = Math.log(Math.tan(lat2 / 2 + Math.PI / 4) / Math.tan(lat1 / 2 + Math.PI / 4));
    if (Math.abs(lon2 - lon1) > Math.PI) {
        if (lon2 <= lon1) {
            dLon = ((lon2 + 2 * Math.PI) - lon1);
        } else {
            dLon = ((lon2 - 2 * Math.PI) - lon1);
        }
    }

    // Normalize to -180..+180
    lon1 = (lon1 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

    let lastLon = lon1;
    for (let i = 0; i <= numPoints; i++) {
        let f = i / numPoints;
        let lat = lat1 + (lat2 - lat1) * f;
        let lon = lon1 + dLon * f;

        // If the line crosses the 180° meridian, split it into two segments
        if (Math.abs(lon - lastLon) > Math.PI) {
            let midLat = (lat + toRad(points[points.length - 1].latitude)) / 2;
            if (lon > lastLon) {
                points.push({ latitude: toDeg(midLat), longitude: -180 });
                points.push({ latitude: toDeg(midLat), longitude: 180 });
            } else {
                points.push({ latitude: toDeg(midLat), longitude: 180 });
                points.push({ latitude: toDeg(midLat), longitude: -180 });
            }
        }

        points.push({ latitude: toDeg(lat), longitude: toDeg(lon) });
        lastLon = lon;
    }

    return points;
}

/*
export function addRhumbLine(RL_points, lineSeries) {
    // Create a line for each pair of points for Rhumb Line
    if (!Array.isArray(RL_points)) {
        console.error('RL_points is not an array');
        return;
    }
    RL_points.forEach(function(point, index) {
        if (index < RL_points.length - 1) { 
            lineSeries.pushDataItem({
            geometry: {
                type: "LineString",
                coordinates: [
                [point.longitude, point.latitude],
                [RL_points[index + 1].longitude, RL_points[index + 1].latitude] 
                ]
            }
            });
        }
    });
}
*/

export function addRhumbLine(RL_points, lineSeries, city1, city2, GreatCircleDistKm, RhumbLineDistKm) {
    if (!Array.isArray(RL_points)) {
        console.error('RL_points is not an array');
        return;
    }

    let percentageDifference = ((RhumbLineDistKm - GreatCircleDistKm) / GreatCircleDistKm) * 100;
    let signedPercentageDifference = (Math.abs(percentageDifference) < 0.005) 
        ? '~0' 
        : (percentageDifference > 0) 
            ? `+${percentageDifference.toFixed(2)}` 
            : percentageDifference.toFixed(2);

    RL_points.forEach(function(point, index) {
        if (index < RL_points.length - 1) {
            let lineData = {
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [point.longitude, point.latitude],
                        [RL_points[index + 1].longitude, RL_points[index + 1].latitude]
                    ]
                },
                id: city1.get("code") + "-" + city2.get("code"),
                airportAName: city1.get("airportName"),
                airportACode: city1.get("code"),
                airportBName: city2.get("airportName"),
                airportBCode: city2.get("code"),
                GreatCircleDistKm: Number(GreatCircleDistKm).toFixed(1),
                RhumbLineDistKm: Number(RhumbLineDistKm).toFixed(1),
                PercentageDifference: signedPercentageDifference,
                stroke: am5.color(0x00FF00),  // Green color for rhumb line
                tooltipText: "{airportAName} ({airportACode}) to {airportBName} ({airportBCode})\nGreat Circle Distance: {GreatCircleDistKm} km\nRhumb Line Distance: {RhumbLineDistKm} km ({PercentageDifference}%)" // Setting tooltip text directly here
            };

            lineSeries.pushDataItem(lineData);

            //lineSeries.mapLines.template.set("tooltipText", "{airportAName} ({airportACode}) to {airportBName} ({airportBCode})\nGreat Circle Distance: {GreatCircleDistKm} km\nRhumb Line Distance: {RhumbLineDistKm} km ({PercentageDifference}%)");
            lineSeries.mapLines.template.set("tooltipText", 
            "[bold]Rhumb Line[/]\n{airportAName} ({airportACode}) to {airportBName} ({airportBCode})\nGreat Circle Distance: {GreatCircleDistKm} km\nRhumb Line Distance: {RhumbLineDistKm} km ({PercentageDifference}%)");
            
        }
    });
    //console.log("############ addRhumbLine - lineSeries: ", lineSeries )
}

export function plotAirportLocation(chart, location, pair) {
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


export function createLegend(root, chart) {
    if (!chart || !chart.children) {
        console.error("Invalid or undefined chart passed to createLegend.");
        return;
    }
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

export function setOrthographicChartCenter(chart, pair) {
    //console.log("setOrthographicChartCenter: ", pair)
    chart.set("rotationX", pair.geoOG_rotationX);
    chart.set("rotationY", pair.geoOG_rotationY);
}

export function setProjectionChartCenter(chart, pair) {
    chart.set("rotationX", pair.geoOG_rotationX);
}

/*
// Set the state of the navigation buttons based on the currently selected airport pair
export function setButtonState() {

    let selector = document.getElementById("selector-1");
    if (selector) {
        let index = selector.selectedIndex;
        if (index == 0) {
            document.getElementById("selector-prev-1").disabled = "disabled";
            document.getElementById("selector-next-1").disabled = "";
        } else if (index >= (selector.options.length - 1)) {
            document.getElementById("selector-prev-1").disabled = "";
            document.getElementById("selector-next-1").disabled = "disabled";
        } else {
            document.getElementById("selector-prev-1").disabled = "";
            document.getElementById("selector-next-1").disabled = "";
        }
    }
}

export function setIndex(increment) {
    const selector = document.getElementById("selector-1");
    if (selector) {
        let newIndex = selector.selectedIndex + increment;
        if (newIndex >= 0 && newIndex < selector.options.length) {
            selector.selectedIndex = newIndex;
            selector.dispatchEvent(new Event("change")); // Manually dispatch the change event to update the maps
        }
    }
    setButtonState();  // Update the Prev/Next button states based on the new dropdown index
}
*/

export function setButtonState(prefix = "1") {
    let selector = document.getElementById(`selector-${prefix}`);
    
    if (selector) {
        let index = selector.selectedIndex;
        if (index == 0) {
            document.getElementById(`selector-prev-${prefix}`).disabled = "disabled";
            document.getElementById(`selector-next-${prefix}`).disabled = "";
        } else if (index >= (selector.options.length - 1)) {
            document.getElementById(`selector-prev-${prefix}`).disabled = "";
            document.getElementById(`selector-next-${prefix}`).disabled = "disabled";
        } else {
            document.getElementById(`selector-prev-${prefix}`).disabled = "";
            document.getElementById(`selector-next-${prefix}`).disabled = "";
        }
    }
}

export function setIndex(increment, prefix = "1") {
    const selector = document.getElementById(`selector-${prefix}`);
    
    if (selector) {
        let newIndex = selector.selectedIndex + increment;
        if (newIndex >= 0 && newIndex < selector.options.length) {
            selector.selectedIndex = newIndex;
            selector.dispatchEvent(new Event("change"));
        }
    }
    setButtonState(prefix);
}


// Function to create a div element for map chart and return the created div
export function createMapDiv(id) {
   //console.log(`createMapDiv called with id: ${id}`);
    
    let div = document.createElement("div");
    div.id = id;
    //div.style.height = "600px"; // Set height here since it's constant

    return div;
}

/*
export function populateDropdown(suggestionPairs) {
    const selector = document.getElementById("selector-1");
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
*/
export function populateDropdown(suggestionPairs, prefix = "1") {
    const selector = document.getElementById(`selector-${prefix}`);
    
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
        setButtonState(prefix); // Updated to take prefix argument
    }
}


export function clearAirportLocations(chart, lineSeries1, lineSeries2) {
    if (chart.pointSeries && chart.pointSeries.data) {
        chart.pointSeries.data.setAll([]);
    }

    if (lineSeries1) {
        lineSeries1.data.setAll([]);
    }

    if (lineSeries2) {
        lineSeries2.data.setAll([]);
    }
}


export async function loadSuggestionPairs() {
    try {
        const response = await fetch('./data/suggestion_pairs.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data.filter(pair => pair.RhumbLineDisplay !== false);
    } catch (error) {
        console.error("Failed to fetch suggestion pairs:", error);
        return [];
    }
}