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
    panY: "rotateY",
    projection: am5map.geoMercator()
}));

var planeSeriesArray = [];

function createSlider() {
    // Create a container for the switch button
    var cont = chart.children.push(am5.Container.new(root, {
        layout: root.horizontalLayout,
        x: 20,
        y: 40
    }));

    // Add labels and controls
    cont.children.push(am5.Label.new(root, {
        centerY: am5.p50,
        text: "Map"
    }));

    var switchButton = cont.children.push(am5.Button.new(root, {
        themeTags: ["switch"],
        centerY: am5.p50,
        icon: am5.Circle.new(root, {
            themeTags: ["icon"]
        })
    }));

    switchButton.on("active", function() {
        if (!switchButton.get("active")) {
            chart.set("projection", am5map.geoMercator());
            chart.set("panY", "translateY");
            chart.set("rotationY", 0); // Reset the vertical rotation
            backgroundSeries.mapPolygons.template.set("fillOpacity", 0);
        } else {
            chart.set("projection", am5map.geoOrthographic());
            chart.set("panY", "rotateY")
            backgroundSeries.mapPolygons.template.set("fillOpacity", 0.1);
        }
    });

    cont.children.push(
        am5.Label.new(root, {
            centerY: am5.p50,
            text: "Globe"
        })
    );
}


// Call the function when the page is loaded
createSlider();

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

// Create point series for markers
var pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
pointSeries.bullets.push(function () {
    var circle = am5.Circle.new(root, {
        radius: 7,
        tooltipText: "Drag me!",
        cursorOverStyle: "pointer",
        tooltipY: 0,
        fill: am5.color(0xffba00),
        stroke: root.interfaceColors.get("background"),
        strokeWidth: 2,
        draggable: true
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
    return am5.Bullet.new(root, {
        sprite: circle
    });
});

function addCity(coords, title) {
    var dataItem = pointSeries.pushDataItem({
        latitude: coords.latitude,
        longitude: coords.longitude
    });
    dataItem.latitude = coords.latitude;
    dataItem.longitude = coords.longitude;
    dataItem.airportName = title;
    return dataItem;
}

function addLineAndPlane(city1, city2) {

    console.log("Inside addLineAndPlane. City1.airportAName: ", city1.airportName)
    console.log("Inside addLineAndPlane. City1.latitude: ", city1.latitude)
    console.log("Inside addLineAndPlane. City1.longitude: ", city1.longitude)
    console.log("Inside addLineAndPlane. City2.airportAName: ", city2.airportName)
    console.log("Inside addLineAndPlane. City2.latitude: ", city2.latitude)
    console.log("Inside addLineAndPlane. City2.longitude: ", city2.longitude)


    var lineDataItem = lineSeries.pushDataItem({
        pointsToConnect: [city1, city2]
    });

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
    console.log(">>> animate method: airport A ", city1.airportName)
    console.log(">>> animate method: airport B ", city2.airportName)

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
}

globalLocationPair.locationPairs.forEach(pair => {
    console.log("Inside forEach Pair (body), calling addLineAndPlane.  Pair: ", pair)
    var city1 = addCity({ latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName);

    console.log("Inside forEach Pair (body). Pair.airportAName: ", pair.airportAName)
   
    var city2 = addCity({ latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName);
    console.log("Inside forEach Pair (body). Pair.airportBName: ", pair.airportBName)
    addLineAndPlane(city1, city2);
});

// Event listener for the "Make maps" button
document.getElementById('make-maps-button').addEventListener('click', function() {

    console.log("globalLocationPair after make-maps-button click: ", globalLocationPair)

    // Stop animations and clear the data from each series in the planeSeriesArray
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
    createSlider();

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
    pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
    pointSeries.bullets.push(function () {
        var circle = am5.Circle.new(root, {
            radius: 7,
            tooltipText: "Drag me!",
            cursorOverStyle: "pointer",
            tooltipY: 0,
            fill: am5.color(0xffba00),
            stroke: root.interfaceColors.get("background"),
            strokeWidth: 2,
            draggable: true
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
        return am5.Bullet.new(root, {
            sprite: circle
        });
    });

    // Add new data
    globalLocationPair.locationPairs.forEach(pair => {
        console.log("Inside forEach Pair (click function), calling addLineAndPlane.  Pair: ", pair)
        var city1 = addCity({ latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName);

        console.log("Inside forEach Pair (click function). Pair.airportAName: ", pair.airportAName)

        var city2 = addCity({ latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName);

        console.log("Inside forEach Pair (click function). Pair.airportBName: ", pair.airportBName)

        addLineAndPlane(city1, city2);
    });

    // Make stuff animate on load
    chart.appear(1000, 100);
});
