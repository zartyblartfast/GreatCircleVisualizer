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

var planeSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
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

function addCity(coords, title) {
    return pointSeries.pushDataItem({
        latitude: coords.latitude,
        longitude: coords.longitude
    });
}

globalLocationPair.locationPairs.forEach(pair => {
    var city1 = addCity({ latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName);
    var city2 = addCity({ latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName);
    
    var lineDataItem = lineSeries.pushDataItem({
        pointsToConnect: [city1, city2]
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
        if (value >= 0.99) {
            plane.set("rotation", 180);
        }
        else if (value <= 0.01) {
            plane.set("rotation", 0);
        }
    });
});

// Event listener for the "Make maps" button
document.getElementById('make-maps-button').addEventListener('click', function() {
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
        var city1 = addCity({ latitude: pair.airportALat, longitude: pair.airportALon }, pair.airportAName);
        var city2 = addCity({ latitude: pair.airportBLat, longitude: pair.airportBLon }, pair.airportBName);
        
        var lineDataItem = lineSeries.pushDataItem({
            pointsToConnect: [city1, city2]
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
            if (value >= 0.99) {
                plane.set("rotation", 180);
            }
            else if (value <= 0.01) {
                plane.set("rotation", 0);
            }
        });
    });

    // Make stuff animate on load
    chart.appear(1000, 100);
});