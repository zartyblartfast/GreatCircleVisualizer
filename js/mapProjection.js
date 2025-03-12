// mapProjection.js
import { Logger } from './logger.js';

export let currentProjectionName = "geoMercator";

// Projection state tracker to reliably track projection state
let projectionState = {
    currentProjection: "geoMercator",
    isAzimuthalEquidistant: false,
    properties: {
        rotationX: 0,
        rotationY: 0,
        panX: "none",
        panY: "none",
        wheelY: "none",
        maxPanOut: 1
    }
};

/**
 * Updates the projection state tracker with the current projection and its properties
 * @param {string} projectionName - The name of the projection
 * @param {Object} properties - The properties associated with the projection
 */
export function updateProjectionState(projectionName, properties = {}) {
    Logger.debug('mapProjection', "[PROJECTION_STATE] Updating projection state:", {
        from: projectionState.currentProjection,
        to: projectionName,
        isAzimuthalEquidistant: projectionName === "geoAzimuthalEquidistant",
        properties: properties
    });
    
    projectionState.currentProjection = projectionName;
    projectionState.isAzimuthalEquidistant = projectionName === "geoAzimuthalEquidistant";
    
    // Update properties if provided
    if (Object.keys(properties).length > 0) {
        projectionState.properties = { ...projectionState.properties, ...properties };
    }
    
    // Update the exported currentProjectionName for backward compatibility
    currentProjectionName = projectionName;
}

/**
 * Checks if the current projection is Azimuthal Equidistant
 * @returns {boolean} True if the current projection is AE
 */
export function isAzimuthalEquidistant() {
    return projectionState.isAzimuthalEquidistant;
}

/**
 * Gets the current projection state
 * @returns {Object} The current projection state
 */
export function getProjectionState() {
    return { ...projectionState };
}

export function updateProjectionName(newName) {
    currentProjectionName = newName;
    // Also update the projection state for consistency
    updateProjectionState(newName);
}

/**
 * Resets chart properties to default values based on the target projection
 * This ensures clean transitions between projections, particularly when switching from AE
 * @param {Object} chart - The chart object to reset properties on
 * @param {string} targetProjection - The projection to reset properties for
 * @returns {Object} The chart with reset properties
 */
export function resetChartPropertiesForProjection(chart, targetProjection) {
    const isAE = targetProjection === "geoAzimuthalEquidistant";
    const currentState = getProjectionState();
    const wasAE = currentState.isAzimuthalEquidistant;
    
    Logger.debug('mapProjection', "[RESET_PROPERTIES] Resetting chart properties:", {
        from: currentState.currentProjection,
        to: targetProjection,
        wasAE: wasAE,
        isAE: isAE,
        currentProperties: {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        }
    });
    
    // Special handling for transitions FROM AE to other projections
    if (wasAE && !isAE) {
        // Force reset all properties when transitioning from AE
        Logger.debug('mapProjection', '[RESET_PROPERTIES] Detected transition FROM AE - forcing complete reset');
        chart.set("rotationX", 0);
        chart.set("rotationY", 0);
        chart.set("panX", targetProjection === "geoOrthographic" ? "rotateX" : "none");
        chart.set("panY", targetProjection === "geoOrthographic" ? "rotateY" : "none");
        chart.set("wheelY", targetProjection === "geoOrthographic" ? "rotateY" : "none");
        chart.set("maxPanOut", 1);
        
        // Update the projection state
        updateProjectionState(targetProjection, {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        });
        
        Logger.debug('mapProjection', '[RESET_PROPERTIES] Chart properties after reset:', {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        });
        
        return chart;
    }
    
    // Default properties for non-AE projections
    if (!isAE) {
        // Set default properties for non-AE projections
        chart.set("rotationX", 0);
        chart.set("rotationY", 0);
        chart.set("panX", "none");
        chart.set("panY", "none");
        chart.set("wheelY", "none");
        chart.set("maxPanOut", 1);
        
        // Special handling for orthographic projection
        if (targetProjection === "geoOrthographic") {
            chart.set("panX", "rotateX");
            chart.set("panY", "rotateY");
            chart.set("wheelY", "rotateY");
        }
    } else {
        // For AE projection, we'll use initializeAEProjection which sets all the necessary properties
        // This is just a safeguard in case initializeAEProjection isn't called
        chart.set("rotationX", 0);
        chart.set("rotationY", -90);
        chart.set("panX", "rotateX");
        chart.set("panY", "rotateY");
        chart.set("wheelY", "rotateY");
        chart.set("maxPanOut", 0);
    }
    
    // Update the projection state
    updateProjectionState(targetProjection, {
        rotationX: chart.get("rotationX"),
        rotationY: chart.get("rotationY"),
        panX: chart.get("panX"),
        panY: chart.get("panY"),
        wheelY: chart.get("wheelY"),
        maxPanOut: chart.get("maxPanOut")
    });
    
    Logger.debug('mapProjection', "[RESET_PROPERTIES] Chart properties after reset:", {
        rotationX: chart.get("rotationX"),
        rotationY: chart.get("rotationY"),
        panX: chart.get("panX"),
        panY: chart.get("panY"),
        wheelY: chart.get("wheelY"),
        maxPanOut: chart.get("maxPanOut")
    });
    
    return chart;
}

/**
 * Initializes the Azimuthal Equidistant projection
 * @param {Object} chart - The chart object to set properties on
 * @param {Object} [projectionFunction=d3.geoAzimuthalEquidistant] - The D3 projection function
 * @param {boolean} useAnimation - Whether to use animation for rotation
 * @returns {Object} The initialized projection
 */
export function initializeAEProjection(chart, projectionFunction = d3.geoAzimuthalEquidistant, useAnimation = false) {
    Logger.debug('mapProjection', "[DEBUG] initializeAEProjection called with useAnimation:", useAnimation);
    
    // Log chart properties before any changes
    Logger.debug('mapProjection', "BEFORE initializeAEProjection - Chart properties:", {
        rotationX: chart.get("rotationX"),
        rotationY: chart.get("rotationY"),
        panX: chart.get("panX"),
        panY: chart.get("panY"),
        wheelY: chart.get("wheelY"),
        maxPanOut: chart.get("maxPanOut"),
        projection: chart.get("projection") ? "defined" : "undefined"
    });
    
    try {
        // Create AE projection with North Pole centered
        const newProjection = projectionFunction()
            .rotate([0, -90, 0]) // Rotate to center the North Pole
            .translate([chart.width() / 2, chart.height() / 2]) // Center in the viewport
            .scale(chart.height() / 2); // Scale to fit the circular map
    
        // Apply the projection
        chart.set("projection", newProjection);
    
        // Set specific rotation for AE projection
        chart.set("rotationX", 0);
        
        if (useAnimation) {
            // Use animation for rotationY (for smoother transitions)
            Logger.debug('mapProjection', "Using animation for rotationY");
            chart.animate({
                key: "rotationY",
                to: -90,
                duration: 1000,
                easing: am5.ease.out(am5.ease.cubic)
            });
        } else {
            // Set rotationY directly (for immediate effect)
            Logger.debug('mapProjection', "Setting rotationY directly to -90");
            chart.set("rotationY", -90);
        }
    
        // Enable vertical dragging (panY)
        chart.set("panX", "rotateX");
        chart.set("panY", "rotateY");
        chart.set("wheelY", "rotateY");
        
        // Set maxPanOut to 0 for AE projection
        chart.set("maxPanOut", 0);
    
        // Log chart properties after changes
        Logger.debug('mapProjection', "AFTER initializeAEProjection - Chart properties:", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut"),
            projection: chart.get("projection") ? "defined" : "undefined"
        });
        
        // Update the projection state
        updateProjectionState("geoAzimuthalEquidistant", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        });
        
        return newProjection;
    } catch (error) {
        Logger.error('mapProjection', "Error initializing AE projection:", error);
        return null;
    }
}

/**
 * Restores the Azimuthal Equidistant projection to ensure the North Pole is properly centered
 * This function is specifically designed to be called when returning to AE projection
 * from other projections, ensuring consistent centering regardless of context
 * 
 * @param {Object} chart - The chart object to restore the AE projection on
 * @param {boolean} useAnimation - Whether to use animation for rotation
 * @param {boolean} verifyCenter - Whether to verify the North Pole centering
 * @returns {boolean} Success status of the restoration
 */
export function restoreAEProjection(chart, useAnimation = false, verifyCenter = true) {
    Logger.debug('mapProjection', "[AE_RESTORE] Restoring AE projection with useAnimation:", useAnimation);
    
    // Log chart properties before restoration
    Logger.debug('mapProjection', "[AE_RESTORE] Chart properties BEFORE restoration:", {
        rotationX: chart.get("rotationX"),
        rotationY: chart.get("rotationY"),
        panX: chart.get("panX"),
        panY: chart.get("panY"),
        wheelY: chart.get("wheelY"),
        maxPanOut: chart.get("maxPanOut"),
        projection: chart.get("projection") ? "defined" : "undefined"
    });
    
    try {
        // First, ensure we have the correct projection function
        const projectionFunction = d3.geoAzimuthalEquidistant;
        
        // Create AE projection with North Pole centered
        const newProjection = projectionFunction()
            .rotate([0, -90, 0]) // Rotate to center the North Pole
            .translate([chart.width() / 2, chart.height() / 2]) // Center in the viewport
            .scale(chart.height() / 2); // Scale to fit the circular map
        
        // Apply the projection
        chart.set("projection", newProjection);
        
        // Set specific rotation for AE projection
        chart.set("rotationX", 0);
        
        if (useAnimation) {
            // Use animation for rotationY (for smoother transitions)
            Logger.debug('mapProjection', "[AE_RESTORE] Using animation for rotationY");
            chart.animate({
                key: "rotationY",
                to: -90,
                duration: 1000,
                easing: am5.ease.out(am5.ease.cubic)
            });
        } else {
            // Set rotationY directly (for immediate effect)
            Logger.debug('mapProjection', "[AE_RESTORE] Setting rotationY directly to -90");
            chart.set("rotationY", -90);
        }
        
        // Set AE-specific chart properties
        chart.set("panX", "none");
        chart.set("panY", "none");
        chart.set("wheelY", "none");
        chart.set("maxPanOut", 0);
        
        // Log chart properties after restoration
        Logger.debug('mapProjection', "[AE_RESTORE] Chart properties AFTER restoration:", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        });
        
        // Update the projection state
        updateProjectionState("geoAzimuthalEquidistant", {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        });
        
        // Verify North Pole centering if requested
        if (verifyCenter) {
            const currentRotationY = chart.get("rotationY");
            // Check if rotationY is close to -90 (allowing for small floating-point differences)
            const isNorthPoleCentered = Math.abs(currentRotationY + 90) < 0.1;
            
            Logger.debug('mapProjection', "[AE_RESTORE] North Pole centering verification:", {
                currentRotationY: currentRotationY,
                isNorthPoleCentered: isNorthPoleCentered
            });
            
            // If not centered correctly, force it
            if (!isNorthPoleCentered && !useAnimation) {
                Logger.warn('mapProjection', "[AE_RESTORE] North Pole not centered correctly, forcing centering");
                chart.set("rotationY", -90);
                return true;
            }
            
            return isNorthPoleCentered;
        }
        
        return true;
    } catch (error) {
        Logger.error('mapProjection', "[AE_RESTORE] Error restoring AE projection:", error);
        return false;
    }
}

/**
 * Updates the map projection
 * @param {Object} chart - The chart object to update the projection on
 * @param {string} projectionName - The name of the projection to update to
 * @param {boolean} isRotatable - Whether the projection is rotatable
 * @returns {Object} The updated projection object
 */
export function updateProjection(chart, projectionName, isRotatable = true) {
    Logger.debug('mapProjection', "[DEBUG] updateProjection called with projectionName:", projectionName, "isRotatable:", isRotatable);
    
    // Disable interactions during projection update
    chart.set("interactionsEnabled", false);
    
    // Extract the projection function name from the full projection string
    let projectionFunctionName = projectionName;
    // If the name includes 'd3.' at the beginning and '()' at the end, remove them
    if (projectionName.startsWith('d3.') && projectionName.endsWith('()')) {
        projectionFunctionName = projectionName.slice(3, -2);
    }
    
    Logger.debug('mapProjection', "[DEBUG] After processing, projectionFunctionName:", projectionFunctionName);
    
    // Get the function from d3.geo namespace if it starts with 'geo'
    let projectionFunction;
    if (projectionFunctionName.startsWith('geo') && d3.geo && typeof d3.geo[projectionFunctionName.slice(3)] === 'function') {
        Logger.debug('mapProjection', "[DEBUG] Found function in d3.geo namespace:", projectionFunctionName.slice(3));
        projectionFunction = d3.geo[projectionFunctionName.slice(3)];
    } else {
        Logger.debug('mapProjection', "[DEBUG] Looking for function directly in d3:", projectionFunctionName);
        projectionFunction = d3[projectionFunctionName];
    }
    
    Logger.debug('mapProjection', "[DEBUG] projectionFunction found:", typeof projectionFunction === 'function');

    if (typeof projectionFunction === 'function') {
        let newProjection;

        if (projectionFunctionName === 'geoAzimuthalEquidistant') {
            // Use the restoreAEProjection function for more reliable centering
            restoreAEProjection(chart, false, true);
            newProjection = projectionFunction();
            chart.set("projection", newProjection);
        } else {
            // Reset chart properties before updating the projection
            chart = resetChartPropertiesForProjection(chart, projectionFunctionName);
            
            // Default case for other projections
            newProjection = projectionFunction();
            chart.set("projection", newProjection);

            // Set standard properties for non-AE projections
            chart.set("panX", isRotatable ? "rotateX" : "none");
            chart.set("panY", isRotatable ? "rotateY" : "none");
            chart.set("wheelY", isRotatable ? "rotateY" : "none");
            chart.set("maxPanOut", 1);
            chart.set("rotationY", isRotatable ? 1 : 0);
        }

        // Re-enable interactions
        chart.set("interactionsEnabled", true);
        
        // Update the projection state
        updateProjectionState(projectionFunctionName, {
            rotationX: chart.get("rotationX"),
            rotationY: chart.get("rotationY"),
            panX: chart.get("panX"),
            panY: chart.get("panY"),
            wheelY: chart.get("wheelY"),
            maxPanOut: chart.get("maxPanOut")
        });
        
        Logger.debug('mapProjection', "[DEBUG] Returning projection:", newProjection ? "defined" : "undefined");
        return newProjection;
    } else {
        Logger.error('mapProjection', `Projection function not found for ${projectionFunctionName}`);
        return null;
    }
}

export function setupProjectionDropdown(chart) {
    // Event listener for the projection dropdown
    var projectionSelect = document.getElementById('projectionSelect');

    projectionSelect.innerHTML = "";

    // Fetch the JSON data from the file
    fetch('./data/projections.json')
        .then(response => response.json())
        .then(data => {
            // Sort the data by the "id" field
            data.sort((a, b) => a.id - b.id);

            // Loop through the sorted data and create an option for each item
            for (var i = 0; i < data.length; i++) {
                var option = document.createElement("option");
                option.text = data[i].name;
                option.value = data[i].projection;
                option.dataset.rotatable = data[i].rotatable;

                // Set the default selection to "geoMercator"
                if (data[i].projection === 'd3.geoMercator()') {
                    option.selected = true;
                }

                projectionSelect.add(option);
            }
        })
        .catch(error => Logger.error('mapProjection', 'Error:', error));

    projectionSelect.addEventListener('change', function() {
        const selectedProjection = projectionSelect.value;
        const isRotatable = projectionSelect.options[projectionSelect.selectedIndex].dataset.rotatable === 'true';

        Logger.debug('mapProjection', "projectionSelect.value: ", projectionSelect.value);
        Logger.debug('mapProjection', "projectionSelect, isRotatable : ", isRotatable);

        updateProjection(chart, selectedProjection, isRotatable);

        // Update currentProjectionName
        updateProjectionName(selectedProjection.slice(3, -2));
    });
}
