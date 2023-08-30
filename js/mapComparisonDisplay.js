import { calculateRhumbLinePoints, addRhumbLine } from './mapUtilities.js';

class MapComparisonDisplay {
    constructor(rootElementId) {
        this.rootElementId = rootElementId;
        this.orthoGraphicMap = null;  // Object to store orthographic map instance
        this.projectionMap = null;   // Object to store projection map instance
        this.currentAirportPair = null;
        this.currentProjection = 'mercator';  // default projection
        this.initializedRoots = {}; 
        this.GClineSeries = null; // Initialize to null
        this.RLlineSeries = null; // Initialize to null
        this.rhumbLinePoints = []; 
        this.planeSeriesArray = null;
    
        // Initialize the data properties to null
        this.suggestionPairs = null;
        this.projections = [
            { id: "geoMercator", name: "Mercator" },
            { id: "geoAiry", name: "Airy" },
            { id: "geoAugust", name: "August" },
            { id: "geoBaker", name: "Baker" },
            { id: "geoBoggs", name: "Boggs" },
            { id: "geoBromley", name: "Bromley" },
            { id: "geoCollignon", name: "Collignon" },
            { id: "geoConicEquidistant", name: "ConicEquidistant" },
            { id: "geoCraig", name: "Craig" },
            { id: "geoEquirectangular", name: "Equirectangular" },
            { id: "geoFahey", name: "Fahey" },
            { id: "geoFoucaut", name: "Foucaut" },
            { id: "geoFoucautSinusoidal", name: "FoucautSinusoidal" },
            { id: "geoNaturalEarth1", name: "NaturalEarth1" },
            { id: "geoLaskowski", name: "Laskowski" },
            { id: "geoLagrange", name: "Lagrange" },
            { id: "geoPeirceQuincuncial", name: "PeirceQuincuncial" },
            { id: "geoTransverseMercator", name: "TransverseMercator" },
            { id: "geoVanDerGrinten", name: "VanDerGrinten" }

            // If geoAzimuthalEquidistant is included, it messes up the positioning of all the maps in the div
            //{ id: "geoAzimuthalEquidistant", name: "AzimuthalEquidistant" }
            
        ];
      }
    
      initialize() {
        this.currentAirportPair = this.suggestionPairs[0]; // Set default to the first pair
        this.currentProjection = this.projections[0].id; // Set default to the first projection
        // ... other initializations
        this.handleAirportSelection(0);  // Index of the first airport pair
        this.handleProjectionSelection(0);  // Index of the first projection
      }

    handleAirportSelection(selectedIndex) {
      const selectedPair = this.suggestionPairs[selectedIndex];
      this.currentAirportPair = selectedPair;
      //console.log(`Selected Airport Pair: ${selectedPair.id}`);
    
      // Plot for orthographic map
      const chartObjectOrtho = this.initializedRoots['chartdiv_orthographic_c'];
      if (chartObjectOrtho) {
        this.plotSelectedPair(selectedPair, chartObjectOrtho);
      } else {
        console.error('No chartObject found for orthographic map');
      }
    
      // Plot for projection map
      const chartObjectProj = this.initializedRoots['chartdiv_projection_c'];
      if (chartObjectProj) {
        this.plotSelectedPair(selectedPair, chartObjectProj);
      } else {
        console.error('No chartObject found for projection map');
      }
    }  

    handleProjectionSelection(selectedIndex) {
      const selectedProjection = this.projections[selectedIndex];
      this.currentProjection = selectedProjection.id;

      this.updateMapProjections();
    }
    
    updateMapProjections() {
      // Update projection for the map on the right and re-plot only on that map
      if (this.projectionMap) {
        this.setProjection(this.projectionMap, this.currentProjection);
        const chartObjectProj = this.initializedRoots['chartdiv_projection_c'];
        if (chartObjectProj) {
          this.plotSelectedPair(this.currentAirportPair, chartObjectProj);
        }
      }
    }

      populateAirportDropdown() {
        const selector = document.getElementById('selector-oc-1');  // Adjusted the ID for the airport dropdown in the new accordion
            
        if (selector && this.suggestionPairs) {
            // Clear any existing options
            selector.innerHTML = '';
                
            // Add options based on suggestionPairs
            this.suggestionPairs.forEach((pair, index) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = pair.id; // Use 'id' property for dropdown text
                selector.appendChild(option);
            });
                
            // Ensure correct button state after populating
            this.setButtonState();  // Make sure to have this method defined in your class
        }
     }
    
      populateProjectionDropdown() {
        const selector = document.getElementById('selector-oc-2');  // Adjusted the ID for the projection dropdown in the new accordion
            
        if (selector && this.projections) {
            // Clear any existing options
            selector.innerHTML = '';
                
            // Add options based on projections array
            this.projections.forEach((projection, index) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = projection.name; // Using 'name' property for dropdown text
                selector.appendChild(option);
            });
                
            // Ensure correct button state after populating, if applicable.
            // This assumes there might be other logic for controlling button states after dropdown population.
            this.setButtonState();  // Make sure to have this method defined in your class if there's a need
        }
      }

      
      async loadSuggestionPairs() {
        try {
            const response = await fetch('./data/suggestion_pairs.json');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            this.suggestionPairs = data.filter(pair => pair.RhumbLineDisplay !== false);
        } catch (error) {
            console.error("Failed to fetch suggestion pairs:", error);
            this.suggestionPairs = [];
        }
      }

      setButtonState(prefix = "oc-1") {
        /* Airport Pair Dropdown Box and prev/next button elements
        selector-prev-oc-1
        selector-oc-1
        selector-next-oc-1
        */
        /* Map projection Dropdown Box and prev/next button elements
        selector-prev-oc-2
        selector-oc-2
        selector-next-oc-2
        */

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
    
    setIndex(increment, prefix = "oc-1") {
        const selector = document.getElementById(`selector-${prefix}`);
        
        if (selector) {
            let newIndex = selector.selectedIndex + increment;
            if (newIndex >= 0 && newIndex < selector.options.length) {
                selector.selectedIndex = newIndex;
                selector.dispatchEvent(new Event("change"));
            }
        }
        this.setButtonState(prefix);
    }

    async createMap(projectionType, divId) {
      return new Promise((resolve) => {
        let localRoot;
        let localChart;
        if (this.initializedRoots[divId]) {
          localRoot = this.initializedRoots[divId].localRoot;
          localChart = this.initializedRoots[divId].localChart;
          localRoot.container.children.clear();  // Clear all children of the container
        } else {
          localRoot = am5.Root.new(divId);
        }
    
        am5.ready(() => {
          //console.log("inside createMap, am5.ready");
          localChart = localRoot.container.children.push(
            am5map.MapChart.new(localRoot, {
              panX: "none",
              //panY: projectionType === "geoOrthographic" ? "rotateY" : "translateY",
              panY: projectionType === "geoOrthographic" ? "rotateY" : "none",
              wheelY: projectionType === "geoOrthographic" ? "rotateY" : "none",
              zoomLevel: 1,
              maxZoomLevel: 0,
              minZoomLevel: 0,
              pinchZoomX: "none",
              pinchZoomY: "none",
              maxPanOut: 0
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

          // Depending on your implementation, you might want to call setProjection here
          this.setProjection(localChart, projectionType);
  
          this.initializedRoots[divId] = {
            localRoot,
            localChart,
            GClineSeries: this.GClineSeries,
            RLlineSeries: this.RLlineSeries
          };
    
          // Update class properties based on the divId
          if (divId === 'chartdiv_orthographic_c') {
            this.orthoGraphicMap = localChart;
          } else if (divId === 'chartdiv_projection_c') {
            this.projectionMap = localChart;
          }
          
          resolve(divId);
        });
      });
    }

    // The setProjection function can also be a method within this class
    setProjection(chart, name) {
      chart.set("projection", d3[name].call(this));
  
      if (name === 'geoOrthographic') {
          chart.set("panX", "rotateX");
          chart.set("panY", "rotateY");
          chart.set("rotationX", 30); //geoOG_rotationX
          chart.set("rotationY", -55); //geoOG_rotationY
          chart.set("wheelY","rotateY");
          chart.set("maxPanOut", 0);
      } else {
          chart.set("panX", "none");
          chart.set("panY", "none");
          chart.set("wheelY","none");
          chart.set("wheelX","none");
      }
      this.setButtonState("oc-2");
    }


    plotSelectedPair(pair, chartObject) {
      if (!pair || !chartObject) {
          console.error('Invalid input provided to plotSelectedPair');
          return;
      }
      const { localRoot, localChart, GClineSeries, RLlineSeries } = chartObject;
  
      //this.createLegend(chartObject)
      
      const location1 = { longitude: pair.airportALon, latitude: pair.airportALat };
      const location2 = { longitude: pair.airportBLon, latitude: pair.airportBLat };

      this.clearAirportLocations(chartObject);

      this.setOrthographicChartCenter(this.currentAirportPair);
      

      this.updateRoutes(chartObject, "great-circle");
      
      let city1 = this.plotAirportLocation(chartObject, location1, this.currentAirportPair);
      let city2 = this.plotAirportLocation(chartObject, location2, this.currentAirportPair);
    
      this.addGreatCircleLine(
        chartObject, // passing chartObject directly
        city1,
        city2,
        pair.GreatCircleDistKm,
        pair.RhumbLineDistKm
      );
  
      this.calculateAndStoreRhumbLinePoints(location1, location2)

      this.addRhumbLineMethod(this.rhumbLinePoints, chartObject.RLlineSeries, city1, city2, pair.GreatCircleDistKm, pair.RhumbLineDistKm)

      this.updateRoutes(chartObject, "rhumb-line");

      this.setProjectionChartCenter(this.currentAirportPair);
    }

    calculateAndStoreRhumbLinePoints(startLocation, endLocation, numPoints) {
      this.rhumbLinePoints = calculateRhumbLinePoints(startLocation, endLocation, numPoints);
    }


    addRhumbLineMethod(RL_points, lineSeries, city1, city2, GreatCircleDistKm, RhumbLineDistKm) {
      addRhumbLine(RL_points, lineSeries, city1, city2, GreatCircleDistKm, RhumbLineDistKm) 
    }
  

    addGreatCircleLine(chartObject, city1, city2, GreatCircleDistKm, RhumbLineDistKm) {
      const { localRoot, localChart, GClineSeries } = chartObject;

      // Check if GClineSeries exists, create if not
      if (!GClineSeries) {
          // Add your logic to initialize GClineSeries if it doesn't exist
      }

      let percentageDifference = ((RhumbLineDistKm - GreatCircleDistKm) / GreatCircleDistKm) * 100;

      let signedPercentageDifference;
      if (Math.abs(percentageDifference) < 0.005) {
          signedPercentageDifference = '~0';
      } else {
          signedPercentageDifference = percentageDifference > 0 ? `+${percentageDifference.toFixed(2)}` : percentageDifference.toFixed(2);
      }

      let lineDataItem = GClineSeries.pushDataItem({
          id: city1.get("code") + "-" + city2.get("code"),
          pointsToConnect: [city1, city2],
          airportAName: city1.get("airportName"),
          airportACode: city1.get("code"),
          airportBName: city2.get("airportName"),
          airportBCode: city2.get("code"),
          GreatCircleDistKm: Number(GreatCircleDistKm).toFixed(1),
          RhumbLineDistKm: Number(RhumbLineDistKm).toFixed(1),
          PercentageDifference: signedPercentageDifference
      });

      GClineSeries.mapLines.template.set("tooltipText",
          "[bold]Great Circle[/]\n{airportAName} ({airportACode}) to {airportBName} ({airportBCode})\nGreat Circle Distance: {GreatCircleDistKm} km\nRhumb Line Distance: {RhumbLineDistKm} km ({PercentageDifference}%)");

     
      /*
      //var planeSeries = localChart.series.push(am5map.MapPointSeries.new(chartObject.root, {}));
      var planeSeries = localChart.series.push(am5map.MapPointSeries.new(localRoot, {}));
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

      // Saving the lineDataItem to the class instance
      this.GClineSeries = lineDataItem;

      return lineDataItem;
    }


    clearAirportLocations(chartObject) {
      if (chartObject.pointSeries) {
          //console.log(">>>>>>>>>>>#### pointSeries IS initialized in chartObject");
          chartObject.pointSeries.data.setAll([])
          //console.log(">>>>>>>>>>>####clearAirportLocations after cleardown, chartObject.pointSeries: ", chartObject.pointSeries)
      }

      if (chartObject.RLlineSeries) {
        chartObject.RLlineSeries.data.setAll([]);
      }
    }

    setOrthographicChartCenter(pair) {
      const chartObject = this.initializedRoots['chartdiv_orthographic_c'];
      if (!chartObject || !chartObject.localChart) {
          console.error("Orthographic chart not initialized.");
          return;
      }
      chartObject.localChart.set("rotationX", pair.geoOG_rotationX);
      chartObject.localChart.set("rotationY", pair.geoOG_rotationY);
    }
  

    setProjectionChartCenter(pair) {
        const chartObject = this.initializedRoots['chartdiv_projection_c'];
        if (!chartObject) {
            console.error("Projection chart not initialized.");
            return;
        }
             
        if (this.currentProjection === "geoAzimuthalEquidistant") {
          chartObject.localChart.set("rotationX", 0);
          chartObject.localChart.set("rotationY", -90);
        } else {
          chartObject.localChart.set("rotationX", pair.geoOG_rotationX);
          chartObject.localChart.set("rotationY", 0);
        }
    }

    updateRoutes(chart, lineType) {
      // Check if chart is available
      if (!chart) {
          console.error("Chart object not provided to updateRoutes");
          return;
      }
  
      // Check if series exists
      if (!chart.localChart.series) {
          console.error("Series property missing in the localChart object.");
          return;
      }
  
      // Initialize Line Series based on the chart
      let lineSeries;
      if (!chart.GClineSeries) {
          chart.GClineSeries = chart.localChart.series.push(am5map.MapLineSeries.new(chart.localChart._root, { calculateDistance: true }));
      }
      if (!chart.RLlineSeries) {
          chart.RLlineSeries = chart.localChart.series.push(am5map.MapLineSeries.new(chart.localChart._root, { calculateDistance: true }));
      }
  
      // Determine which line series to use
      lineSeries = lineType === 'great-circle' ? chart.GClineSeries : chart.RLlineSeries;
  
      // Apply styles
      lineSeries.mapLines.template.setAll({
          stroke: am5.color(lineType === 'great-circle' ? 0xFF0000 : 0x000000),
          strokeWidth: 4
      });
    }


    addCity(pointSeries, coords, title, code, country) {
      const dataItem = pointSeries.pushDataItem({
        latitude: coords.latitude,
        longitude: coords.longitude,
        airportName: title,
        code: code,
        country: country
      });
      dataItem.tooltipText = "{airportName} ({code})\nCountry: {country}\nLatitude: {latitude}\nLongitude: {longitude}";
      return dataItem;
    }

    createPointSeries(chartObject) {
      const { localRoot, localChart } = chartObject;
      if (!localRoot || !localChart) {
        console.error("Chart object or localChart not found");
        return;
      }
  
      const root = chartObject.localRoot;
      const chart = chartObject.localChart;
      
      // Create the point series
      const pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
      pointSeries.bullets.push(() => {
        const circle = am5.Circle.new(root, {
          radius: 7,
          cursorOverStyle: "pointer",
          tooltipY: 0,
          fill: am5.color(0xffba00),
          stroke: root.interfaceColors.get("background"),
          strokeWidth: 2,
          draggable: false
        });
        circle.events.on("dragged", function (event) {
          const dataItem = event.target.dataItem;
          const projection = chart.get("projection");
          const geoPoint = chart.invert({ x: circle.x(), y: circle.y() });
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
      
      // Store the created pointSeries for later use
      this.pointSeries = pointSeries;
      return pointSeries;
    }
    
    plotAirportLocation(chartObject, location, pair) {
      const { localRoot, localChart } = chartObject;
    
      if (!localRoot || !localChart) {
        console.error("Chart object or localChart not provided to plotAirportLocation");
        return;
      }
    
      // Check if pointSeries exists, create if not
      if (!chartObject.pointSeries) {
        chartObject.pointSeries = this.createPointSeries(chartObject); // <-- Now it should work
      }

      let city;
    
      if (location.latitude === pair.airportALat && location.longitude === pair.airportALon) {
        city = this.addCity(chartObject.pointSeries, location, pair.airportAName, pair.airportACode, pair.airportACountryFull); // <-- Note the update here
      } else if (location.latitude === pair.airportBLat && location.longitude === pair.airportBLon) {
        city = this.addCity(chartObject.pointSeries, location, pair.airportBName, pair.airportBCode, pair.airportBCountryFull); // <-- Note the update here
      }
    
      return city;
    }
  }
  export const mapComparison = new MapComparisonDisplay('accordionOc');  // assuming 'accordionOc' is the id you want to pass.
