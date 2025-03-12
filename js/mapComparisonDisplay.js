import { calculateRhumbLinePoints, addRhumbLine, addCity } from './mapUtilities.js';
import { 
    updateProjection as updateProjectionFromMapProjection, 
    initializeAEProjection, 
    resetChartPropertiesForProjection,
    restoreAEProjection
} from './mapProjection.js';
import { Logger } from './logger.js';

class MapComparisonDisplay {
    constructor(rootElementId) {
        this.rootElementId = rootElementId;
        this.orthoGraphicMap = null;  // Object to store orthographic map instance
        this.projectionMap = null;   // Object to store projection map instance
        this.currentAirportPair = null;
        this.currentProjection = 'geoMercator';  // default projection
        this.previousProjection = null; // Store the previous projection
        this.initializedRoots = {}; 
        this.GClineSeries = null; // Initialize to null
        this.RLlineSeries = null; // Initialize to null
        this.rhumbLinePoints = []; 
        this.planeSeriesArray = null;
        this.isTogglingMapGlobe = false; // Flag to track when a toggle operation is in progress
    
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
            { id: "geoVanDerGrinten", name: "VanDerGrinten" },
            { id: "geoAzimuthalEquidistant", name: "AzimuthalEquidistant" }
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
      Logger.info('mapComparisonDisplay', `Selected Airport Pair: ${selectedPair.id}`);
    
      // Plot for orthographic map
      const chartObjectOrtho = this.initializedRoots['chartdiv_orthographic_c'];
      if (chartObjectOrtho) {
        this.plotSelectedPair(selectedPair, chartObjectOrtho);
      } else {
        Logger.error('mapComparisonDisplay', 'No chartObject found for orthographic map');
      }
    
      // Plot for projection map
      const chartObjectProj = this.initializedRoots['chartdiv_projection_c'];
      if (chartObjectProj) {
        this.plotSelectedPair(selectedPair, chartObjectProj);
      } else {
        Logger.error('mapComparisonDisplay', 'No chartObject found for projection map');
      }
    }  

    handleProjectionSelection(selectedIndex) {
      const selectedProjection = this.projections[selectedIndex];
      
      // Log before updating projections
      Logger.debug('mapComparisonDisplay', "[PROJECTION_TRACKING] BEFORE handleProjectionSelection - Projections:", {
        currentProjection: this.currentProjection,
        previousProjection: this.previousProjection,
        newProjection: selectedProjection.id
      });
      
      // Store the current projection before updating
      const oldProjection = this.currentProjection;
      
      // Store the current projection as previous before updating
      this.previousProjection = this.currentProjection;
      
      // Now update to the new projection
      this.currentProjection = selectedProjection.id;
      
      // Log after updating projections
      Logger.debug('mapComparisonDisplay', "[PROJECTION_TRACKING] AFTER handleProjectionSelection - Projections:", {
        currentProjection: this.currentProjection,
        previousProjection: this.previousProjection,
        oldProjection: oldProjection
      });
      
      // Pass the old projection to updateMapProjections
      this.updateMapProjections(oldProjection);
    }
    
    updateMapProjections(oldProjection) {
      Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] updateMapProjections called. Current projection:", this.currentProjection);
      if (this.projectionMap) {
        // Determine if we're switching from AE projection using the passed oldProjection
        const wasAzimuthalEquidistant = oldProjection === 'geoAzimuthalEquidistant';
        
        // Log the transition detection and toggle state
        Logger.debug('mapComparisonDisplay', "Transition detection:", {
          oldProjection: oldProjection,
          wasAzimuthalEquidistant: wasAzimuthalEquidistant,
          isTogglingMapGlobe: this.isTogglingMapGlobe || false
        });
        
        this.setProjection(this.projectionMap, this.currentProjection, oldProjection);
        const chartObjectProj = this.initializedRoots['chartdiv_projection_c'];
        if (chartObjectProj) {
          this.plotSelectedPair(this.currentAirportPair, chartObjectProj);
          
          // Only call setProjectionChartCenter if we're not in the middle of a toggle operation
          // This prevents conflicts with the toggle-specific centering logic
          if (!this.isTogglingMapGlobe) {
            // Log before calling setProjectionChartCenter
            Logger.debug('mapComparisonDisplay', "About to call setProjectionChartCenter from updateMapProjections");
            
            // Always call setProjectionChartCenter to ensure proper centering
            setTimeout(() => {
              // Pass information about the transition to setProjectionChartCenter
              this.setProjectionChartCenter(this.currentAirportPair, wasAzimuthalEquidistant);
            }, 100);
          } else {
            Logger.debug('mapComparisonDisplay', "Skipping setProjectionChartCenter call because toggle is in progress");
          }
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
            Logger.error('mapComparisonDisplay', "Failed to fetch suggestion pairs:", error);
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
          this.setProjection(localChart, projectionType, projectionType);
  
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
    setProjection(chart, name, oldProjection) {
        Logger.debug('mapComparisonDisplay', "setProjection called with name:", name);
        
        // Check if d3 is available
        if (!d3) {
            Logger.error('mapComparisonDisplay', "d3 is not available");
            return;
        }
        
        // Log chart properties before any changes
        Logger.debug('mapComparisonDisplay', "BEFORE setProjection - Chart properties:", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        });
        
        // Reset chart properties for the target projection
        // This ensures clean transitions between projections
        resetChartPropertiesForProjection(chart, name);

        if (name === "geoAzimuthalEquidistant") {
            // For AE projection, use the restoreAEProjection function instead of centerAEProjection
            Logger.debug('mapComparisonDisplay', "Calling restoreAEProjection from setProjection");
            // Use restoreAEProjection with no animation for immediate effect
            const success = restoreAEProjection(chart, false, true);
            Logger.debug('mapComparisonDisplay', "restoreAEProjection result:", success);
        } else {
            // For non-AE projections, call updateProjection from mapProjection.js
            const isOrthographic = name === "geoOrthographic";
            Logger.debug('mapComparisonDisplay', "Calling updateProjectionFromMapProjection with:", {
                chart: "chart object",
                name,
                isOrthographic
            });
            
            const projection = updateProjectionFromMapProjection(chart, name, isOrthographic);
            Logger.debug('mapComparisonDisplay', "Projection returned:", projection ? "defined" : "undefined");
            
            // Explicitly ensure maxPanOut is set to 1 for non-AE projections
            // This addresses the root cause of the projection transition issues
            if (name !== "geoAzimuthalEquidistant") {
                Logger.debug('mapComparisonDisplay', "Explicitly setting maxPanOut to 1 for non-AE projection");
                chart.set("maxPanOut", 1);
            }
        }
        
        // Check if we're switching FROM AE projection to another projection
        // This must be done at the end to ensure our settings are the final ones applied
        const switchingFromAE = oldProjection === 'geoAzimuthalEquidistant' && name !== 'geoAzimuthalEquidistant';

        // If we're switching from AE to another projection, ensure all properties are properly reset
        if (switchingFromAE) {
            Logger.debug('mapComparisonDisplay', "FINAL CHECK: Detected transition FROM AE projection - forcing complete property reset");
            // Force a complete reset of all properties as the final step
            chart.set("rotationX", 0);
            chart.set("rotationY", 0);
            chart.set("panX", name === "geoOrthographic" ? "rotateX" : "none");
            chart.set("panY", name === "geoOrthographic" ? "rotateY" : "none");
            chart.set("wheelY", name === "geoOrthographic" ? "rotateY" : "none");
            chart.set("maxPanOut", 1);
}
        // Update projection tracking
        this.previousProjection = this.currentProjection;
        this.currentProjection = name;
        
        // Log chart properties after changes
        Logger.debug('mapComparisonDisplay', "AFTER setProjection - Chart properties:", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut"),
            currentProjection: this.currentProjection,
            previousProjection: this.previousProjection
        });
    }

    centerAEProjection(chart) {
        Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] centerAEProjection called");
        
        // Log chart properties before any changes
        Logger.debug('mapComparisonDisplay', "BEFORE centerAEProjection - Chart properties:", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut"),
            projection: chart.get("projection") ? "defined" : "undefined"
        });
        
        // Use the new restoreAEProjection function for more reliable centering
        // Pass false to avoid animation when called from setProjection
        const success = restoreAEProjection(chart, false, true);
        Logger.debug('mapComparisonDisplay', "restoreAEProjection result:", success);
        
        // Log chart properties after changes
        Logger.debug('mapComparisonDisplay', "AFTER centerAEProjection - Chart properties:", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut"),
            projection: chart.get("projection") ? "defined" : "undefined"
        });
        
        Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] AE projection centered using restoreAEProjection");
    }

    // Add a new method to handle map/globe toggle
    toggleMapGlobe() {
        Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] toggleMapGlobe called. Current projection:", this.currentProjection);
        
        // Add a flag to track when a toggle operation is in progress
        this.isTogglingMapGlobe = true;
        
        // Log projections at the start of toggleMapGlobe
        Logger.debug('mapComparisonDisplay', "[PROJECTION_TRACKING] START of toggleMapGlobe - Projections:", {
            currentProjection: this.currentProjection,
            previousProjection: this.previousProjection,
            isTogglingMapGlobe: this.isTogglingMapGlobe
        });
        
        const chartObject = this.initializedRoots['chartdiv_projection_c'];
        if (!chartObject) {
            Logger.error('mapComparisonDisplay', "[MAP_DEBUG] Projection chart not initialized.");
            this.isTogglingMapGlobe = false;
            return;
        }

        // Log chart properties before toggle
        Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Chart properties BEFORE toggle:", {
            rotationX: chartObject.localChart.get("rotationX"),
            rotationY: chartObject.localChart.get("rotationY"),
            panX: chartObject.localChart.get("panX"),
            panY: chartObject.localChart.get("panY"),
            wheelY: chartObject.localChart.get("wheelY"),
            maxPanOut: chartObject.localChart.get("maxPanOut")
        });

        // Store the current rotation before toggling
        const currentRotationX = chartObject.localChart.get("rotationX");
        const currentRotationY = chartObject.localChart.get("rotationY");
        
        // Store if we're toggling from AE projection
        const wasAzimuthalEquidistant = this.currentProjection === "geoAzimuthalEquidistant";
        Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Toggling with wasAzimuthalEquidistant:", wasAzimuthalEquidistant);

        // Toggle between map and globe view
        if (this.currentProjection === "geoOrthographic") {
            // Log before switching from globe
            Logger.debug('mapComparisonDisplay', "[PROJECTION_TRACKING] BEFORE switching from globe - Projections:", {
                currentProjection: this.currentProjection,
                previousProjection: this.previousProjection,
                newProjection: this.previousProjection || "geoMercator"
            });
            
            // Switch to the previous 2D projection
            this.currentProjection = this.previousProjection || "geoMercator";
            
            // Log after switching from globe
            Logger.debug('mapComparisonDisplay', "[PROJECTION_TRACKING] AFTER switching from globe - Projections:", {
                currentProjection: this.currentProjection,
                previousProjection: this.previousProjection
            });
        } else {
            // Log before switching to globe
            Logger.debug('mapComparisonDisplay', "[PROJECTION_TRACKING] BEFORE switching to globe - Projections:", {
                currentProjection: this.currentProjection,
                previousProjection: this.previousProjection,
                willBecomePrevious: this.currentProjection
            });
            
            // Store the current 2D projection before switching to globe
            this.previousProjection = this.currentProjection;
            this.currentProjection = "geoOrthographic";
            
            // Log after switching to globe
            Logger.debug('mapComparisonDisplay', "[PROJECTION_TRACKING] AFTER switching to globe - Projections:", {
                currentProjection: this.currentProjection,
                previousProjection: this.previousProjection
            });
        }
        Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] New projection after toggle:", this.currentProjection);

        // Reset chart properties before changing projection
        // This ensures clean transitions between projections
        Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] About to reset chart properties for projection:", this.currentProjection);
        resetChartPropertiesForProjection(chartObject.localChart, this.currentProjection);
        
        // Log chart properties after reset
        Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Chart properties AFTER reset:", {
            rotationX: chartObject.localChart.get("rotationX"),
            rotationY: chartObject.localChart.get("rotationY"),
            panX: chartObject.localChart.get("panX"),
            panY: chartObject.localChart.get("panY"),
            wheelY: chartObject.localChart.get("wheelY"),
            maxPanOut: chartObject.localChart.get("maxPanOut")
        });
        
        // Update the projection
        Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Calling updateMapProjections with oldProjection:", wasAzimuthalEquidistant ? "geoAzimuthalEquidistant" : null);
        this.updateMapProjections(wasAzimuthalEquidistant ? "geoAzimuthalEquidistant" : null);
        
        // Ensure proper centering after toggle with improved reliability
        setTimeout(() => {
            Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Toggle timeout handler executing");
            
            // Log chart properties in timeout before any changes
            Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Chart properties in timeout BEFORE changes:", {
                rotationX: chartObject.localChart.get("rotationX"),
                rotationY: chartObject.localChart.get("rotationY"),
                panX: chartObject.localChart.get("panX"),
                panY: chartObject.localChart.get("panY"),
                wheelY: chartObject.localChart.get("wheelY"),
                maxPanOut: chartObject.localChart.get("maxPanOut"),
                currentProjection: this.currentProjection
            });
            
            if (this.currentProjection === "geoAzimuthalEquidistant") {
                Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] Ensuring AE projection is centered on North Pole after toggle");
                // Use restoreAEProjection instead of initializeAEProjection for more reliable centering
                Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Calling restoreAEProjection with animation");
                restoreAEProjection(chartObject.localChart, true, true);
                
                // Log AE specific properties after restoration
                Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] AE projection restored, rotationY:", chartObject.localChart.get("rotationY"));
            } else if (this.currentProjection === "geoOrthographic") {
                // Restore the previous rotation for the globe view
                Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] Restoring globe rotation after toggle:", {
                    rotationX: currentRotationX,
                    rotationY: currentRotationY
                });
                chartObject.localChart.set("rotationX", currentRotationX);
                chartObject.localChart.set("rotationY", currentRotationY);
            }
            
            // Log chart properties after all changes
            Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Chart properties in timeout AFTER changes:", {
                rotationX: chartObject.localChart.get("rotationX"),
                rotationY: chartObject.localChart.get("rotationY"),
                panX: chartObject.localChart.get("panX"),
                panY: chartObject.localChart.get("panY"),
                wheelY: chartObject.localChart.get("wheelY"),
                maxPanOut: chartObject.localChart.get("maxPanOut")
            });
            
            // Replot the current airport pair to ensure routes are preserved
            this.plotSelectedPair(this.currentAirportPair, chartObject);
            
            // Clear the toggle flag after the operation is complete
            this.isTogglingMapGlobe = false;
            Logger.debug('mapComparisonDisplay', "[TOGGLE_TRACKING] Toggle operation complete, flag reset:", this.isTogglingMapGlobe);
        }, 600); // Increased delay to ensure the projection has fully updated
    }

    setProjectionChartCenter(pair, wasAzimuthalEquidistant = false) {
        Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] setProjectionChartCenter called. Current projection:", this.currentProjection);
        const chartObject = this.initializedRoots['chartdiv_projection_c'];
        if (!chartObject || !chartObject.localChart) {
            Logger.error('mapComparisonDisplay', "Chart object not found for setProjectionChartCenter");
            return;
        }

        // Log chart properties before any changes
        Logger.debug('mapComparisonDisplay', "BEFORE setProjectionChartCenter - Chart properties:", {
            rotationX: chartObject.localChart.get("rotationX"),
            rotationY: chartObject.localChart.get("rotationY"),
            panX: chartObject.localChart.get("panX"),
            panY: chartObject.localChart.get("panY"),
            wheelY: chartObject.localChart.get("wheelY"),
            maxPanOut: chartObject.localChart.get("maxPanOut"),
            currentProjection: this.currentProjection
        });

        Logger.debug('mapComparisonDisplay', "Pair values for rotation:", {
            geoOG_rotationX: pair.geoOG_rotationX,
            geoOG_rotationY: pair.geoOG_rotationY,
            pairId: pair.id
        });
         
        if (this.currentProjection === "geoAzimuthalEquidistant") {
          Logger.debug('mapComparisonDisplay', "Calling centerAEProjection from setProjectionChartCenter");
          // Call centerAEProjection to ensure complete and consistent initialization
          this.centerAEProjection(chartObject.localChart);
        } else {
          // If we just switched from AE projection, ensure chart properties are reset
          if (wasAzimuthalEquidistant) {
            Logger.debug('mapComparisonDisplay', "Ensuring chart properties are reset after switching from AE projection");
            chartObject.localChart.set("rotationX", 0);
            chartObject.localChart.set("rotationY", 0);
            chartObject.localChart.set("maxPanOut", 1);
            
            // Force a small redraw to ensure settings take effect
            chartObject.localChart.set("zoomLevel", chartObject.localChart.get("zoomLevel") * 0.99);
            setTimeout(() => {
                chartObject.localChart.set("zoomLevel", chartObject.localChart.get("zoomLevel") / 0.99);
            }, 50);
          }
          
          // Store the current maxPanOut value before animation
          const currentMaxPanOut = chartObject.localChart.get("maxPanOut");
          
          Logger.debug('mapComparisonDisplay', "Animating rotation for non-AE projection. Target rotationX:", pair.geoOG_rotationX);
          chartObject.localChart.animate({
            key: "rotationX",
            to: pair.geoOG_rotationX,
            duration: 1000,
            easing: am5.ease.out(am5.ease.cubic)
          });
          chartObject.localChart.animate({
            key: "rotationY",
            to: 0,
            duration: 1000,
            easing: am5.ease.out(am5.ease.cubic)
          });
          
          // Ensure maxPanOut is preserved for non-AE projections
          if (currentMaxPanOut !== 1 && this.currentProjection !== "geoAzimuthalEquidistant") {
            Logger.debug('mapComparisonDisplay', "Preserving maxPanOut=1 for non-AE projection after animation");
            chartObject.localChart.set("maxPanOut", 1);
          }
        }
        
        // Log chart properties after changes
        Logger.debug('mapComparisonDisplay', "AFTER setProjectionChartCenter - Chart properties:", {
            rotationX: chartObject.localChart.get("rotationX"),
            rotationY: chartObject.localChart.get("rotationY"),
            panX: chartObject.localChart.get("panX"),
            panY: chartObject.localChart.get("panY"),
            wheelY: chartObject.localChart.get("wheelY"),
            maxPanOut: chartObject.localChart.get("maxPanOut"),
            currentProjection: this.currentProjection
        });
        
        // Add logging after animation completes
        setTimeout(() => {
            Logger.debug('mapComparisonDisplay', "AFTER ANIMATION COMPLETE - Chart properties:", {
                rotationX: chartObject.localChart.get("rotationX"),
                rotationY: chartObject.localChart.get("rotationY"),
                panX: chartObject.localChart.get("panX"),
                panY: chartObject.localChart.get("panY"),
                wheelY: chartObject.localChart.get("wheelY"),
                maxPanOut: chartObject.localChart.get("maxPanOut"),
                currentProjection: this.currentProjection
            });
        }, 1500); // 1500ms delay to ensure animation (1000ms) has completed
    }

    plotSelectedPair(pair, chartObject) {
      if (!pair || !chartObject) {
          Logger.error('mapComparisonDisplay', 'Invalid input provided to plotSelectedPair');
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

      this.setProjectionChartCenter(pair);
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
          Logger.error('mapComparisonDisplay', "Orthographic chart not initialized.");
          return;
      }
      chartObject.localChart.set("rotationX", pair.geoOG_rotationX);
      chartObject.localChart.set("rotationY", pair.geoOG_rotationY);
    }
  

    updateRoutes(chart, lineType) {
        // Check if chart is available
        if (!chart) {
            Logger.error('mapComparisonDisplay', "Chart object not provided to updateRoutes");
            return;
        }
    
        // Check if series exists
        if (!chart.localChart.series) {
            Logger.error('mapComparisonDisplay', "Series property missing in the localChart object.");
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

    createPointSeries(chartObject) {
        const { localRoot, localChart } = chartObject;
        if (!localRoot || !localChart) {
          Logger.error('mapComparisonDisplay', "Chart object or localChart not found");
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
          Logger.error('mapComparisonDisplay', "Chart object or localChart not provided to plotAirportLocation");
          return;
        }
      
        // Check if pointSeries exists, create if not
        if (!chartObject.pointSeries) {
          chartObject.pointSeries = this.createPointSeries(chartObject);
        }
  
        let city;
      
        if (location.latitude === pair.airportALat && location.longitude === pair.airportALon) {
          city = addCity(chartObject.localChart._root, chartObject.localChart, chartObject.pointSeries, location, pair.airportAName, pair.airportACode, pair.airportACountryFull);
        } else if (location.latitude === pair.airportBLat && location.longitude === pair.airportBLon) {
          city = addCity(chartObject.localChart._root, chartObject.localChart, chartObject.pointSeries, location, pair.airportBName, pair.airportBCode, pair.airportBCountryFull);
        }
      
        return city;
    }
}

export const mapComparison = new MapComparisonDisplay('accordionOc');  // assuming 'accordionOc' is the id you want to pass.
