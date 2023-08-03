// mapUtilities.js
//import { currentProjectionName } from './mapProjection.js';
import { currentProjectionName, updateProjection } from './mapProjection.js';
// Access the global instance
//var globalLocationPair = window.globalLocationPair;
//import { locationPair } from './locationPairClass.js';
/*
export function haversineDistance(coords1, coords2, isMiles = false) {
    function toRad(x) {
      return x * Math.PI / 180;
    }
  
    var lon1 = coords1.longitude;
    var lat1 = coords1.latitude;
  
    var lon2 = coords2.longitude;
    var lat2 = coords2.latitude;
  
    var R = 6371; // km
  
    var x1 = lat2 - lat1;
    var dLat = toRad(x1);
    var x2 = lon2 - lon1;
    var dLon = toRad(x2)
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
  
    if(isMiles) d /= 1.60934;
  
    return d;
  }
*/

export function addCity(root, chart, pointSeries, coords, title, code, country) {
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

    /*
    var lineDataItem = lineSeries.pushDataItem({
        pointsToConnect: [city1, city2]
    });
    */

    // Calculate the percentage difference
    let percentageDifference = ((RhumbLineDistKm - GreatCircleDistKm) / GreatCircleDistKm) * 100;

    // Include the sign in the percentage difference
    let signedPercentageDifference;
    if (Math.abs(percentageDifference) < 0.005) { // If the absolute value of the percentage difference is less than 0.005
        signedPercentageDifference = '~0';
    } else {
        signedPercentageDifference = percentageDifference > 0 ? `+${percentageDifference.toFixed(2)}` : percentageDifference.toFixed(2);
    }

    /* original working code for rollback
    var lineDataItem = lineSeries.pushDataItem({
        pointsToConnect: [city1, city2],
        airportAName: city1.get("airportName"),
        airportACode: city1.get("code"),
        airportBName: city2.get("airportName"),
        airportBCode: city2.get("code"),
        GreatCircleDistKm: Number(GreatCircleDistKm).toFixed(1),
        RhumbLineDistKm: Number(RhumbLineDistKm).toFixed(1),
        PercentageDifference: signedPercentageDifference
    });
    */

  
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

    lineSeries.mapLines.template.set("tooltipText", "{airportAName} ({airportACode}) to {airportBName} ({airportBCode})\nGreat Circle Distance: {GreatCircleDistKm} km\nRhumb Line Distance: {RhumbLineDistKm} km ({PercentageDifference}%)");

    console.log('2. linesMap:', linesMap);
    linesMap.set(city1.get("code") + "-" + city2.get("code"), lineDataItem);

    /*
    // Calculate the points for the rhumb line
    var rhumbLinePoints = calculateRhumbLinePoints(
        { latitude: city1.get("latitude"), longitude: city1.get("longitude") },
        { latitude: city2.get("latitude"), longitude: city2.get("longitude") }
    );
    */

    //console.log("rhumbLinePoints: ",rhumbLinePoints)

    // Add a new data item to the rhumbLineSeries for each pair of cities
    
    /*
    rhumbLineSeries.data.push({
        multiGeoLine: rhumbLinePoints
    });
     */

    /*
    rhumbLineSeries.mapLines.template.setAll({
        stroke: am5.color(0xff0000), // red color
        strokeWidth: 2
    });
    */
    
    /*
    rhumbLineSeries.data.push({
        multiGeoLine: [rhumbLinePoints]
    });
    */
   // Add a new data item to the rhumbLineSeries for each pair of cities
    //rhumbLineSeries.data.push({
    //    multiGeoLine: [rhumbLinePoints.map(point => [point.longitude, point.latitude])]
    //});
    /*
    rhumbLineSeries.data.push({
        multiGeoLine: [rhumbLinePoints.map(point => ({ longitude: point.longitude, latitude: point.latitude }))]
    });
    */

    //chart.series.push(rhumbLineSeries);

    //console.log(rhumbLineSeries.dataItems[0]._settings.multiGeoLine);
    //console.log("rhumbLineSeries.dataItems",rhumbLineSeries.dataItems);


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

    //These two console.log statement prevent more than one airport pair from being plotted
    //console.log(">>> animate method: airport A ", city1.airportName)
    //console.log(">>> animate method: airport B ", city2.airportName)

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
    // rollback by removing this...

    return lineDataItem; // Return the line's unique ID

}

export function createSlider(root, chart, backgroundSeries, projectionFunction) {
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

    var currentProjection = chart.get("projection");

    /*
    switchButton.on("active", function() {
        if (!switchButton.get("active")) {
            labelMap.set("visible", true);
            labelGlobe.set("visible", false);

            chart.set("projection", currentProjection);

            if (currentProjectionName === "geoAzimuthalEquidistant") {
                chart.set("panX", "rotateX");
                chart.set("panY", "rotateY");
                chart.set("rotationY", 1);
            } else {
                chart.set("panX", "rotateX");
                chart.set("panY", "translateY");
                chart.set("rotationY", 0);
            }
        } else {
            labelMap.set("visible", false);
            labelGlobe.set("visible", true);

            currentProjection = chart.get("projection");
            chart.set("projection", am5map.geoOrthographic());
            chart.set("panY", "rotateY");
        }
    });
    */
    switchButton.on("active", function() {
        var projectionSelect = document.getElementById('projectionSelect'); // Assuming the ID of the dropdown element is 'projectionSelect'
        if (!switchButton.get("active")) {
            labelMap.set("visible", true);
            labelGlobe.set("visible", false);
    
            chart.set("projection", currentProjection);
    
            if (currentProjectionName === "geoAzimuthalEquidistant") {
                chart.set("panX", "rotateX");
                chart.set("panY", "rotateY");
                chart.set("rotationY", 1);
            } else {
                chart.set("panX", "rotateX");
                chart.set("panY", "translateY");
                chart.set("rotationY", 0);
            }
    
            projectionSelect.disabled = false; // Enable the dropdown
        } else {
            labelMap.set("visible", false);
            labelGlobe.set("visible", true);
    
            currentProjection = chart.get("projection");
            chart.set("projection", am5map.geoOrthographic());
            chart.set("panY", "rotateY");
    
            projectionSelect.disabled = true; // Disable the dropdown
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

/*
export function rhumbDistance(coords1, coords2, isMiles = false) {
    function toRad(x) {
        return x * Math.PI / 180;
    }

    function toDeg(x) {
        return x * 180 / Math.PI;
    }

    var lon1 = coords1.longitude;
    var lat1 = coords1.latitude;

    var lon2 = coords2.longitude;
    var lat2 = coords2.latitude;

    var R = 6371; // km

    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);

    var dPhi = Math.log(Math.tan(toRad(lat2) / 2 + Math.PI / 4) / Math.tan(toRad(lat1) / 2 + Math.PI / 4));
    var q = (isFinite(dLat / dPhi)) ? dLat / dPhi : Math.cos(toRad(lat1));  // E-W line gives dPhi=0

    // if dLon over 180° take shorter rhumb across 180° meridian:
    if (Math.abs(dLon) > Math.PI) {
        dLon = dLon > 0 ? -(2 * Math.PI - dLon) : (2 * Math.PI + dLon);
    }

    var dist = Math.sqrt(dLat * dLat + q * q * dLon * dLon) * R;

    if(isMiles) dist /= 1.60934;

    return dist;
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

    for (let i = 0; i <= numPoints; i++) {
        let f = i / numPoints;
        let lat = lat1 + (lat2 - lat1) * f;
        let lon = lon1 + dLon * f;
        points.push({ latitude: toDeg(lat), longitude: toDeg(lon) });
    }

    return points;
}

export function toRad(x) {
    return x * Math.PI / 180;
}

export function toDeg(x) {
    return x * 180 / Math.PI;
}
*/
