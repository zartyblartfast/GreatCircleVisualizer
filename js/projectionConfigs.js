// projectionConfigs.js
// This module loads and provides the projection configurations from the JSON file

import { Logger } from './logger.js';

// Minimal fallback configuration to use ONLY if JSON loading fails completely
const fallbackConfig = {
  "default": {
    "rotationX": 0,
    "rotationY": 0,
    "panX": "none",
    "panY": "none",
    "wheelY": "none",
    "maxPanOut": 0,
    "allowRotation": false
  }
};

// Variables to store the loaded configurations
let projectionConfigs = null;
let projectionsList = null;

/**
 * Loads the projection configurations from the JSON file
 * @returns {Promise<Object>} The loaded configurations
 */
export async function loadProjectionConfigs() {
  if (projectionConfigs !== null) {
    return projectionConfigs; // Return cached configs if already loaded
  }
  
  try {
    const response = await fetch('../data/projections2.json');
    if (!response.ok) {
      throw new Error(`Failed to load projections: ${response.status} ${response.statusText}`);
    }
    
    // Store the full projections list for reference
    projectionsList = await response.json();
    
    // Convert the array to a map for easier lookup by projection function name
    projectionConfigs = {};
    projectionsList.forEach(proj => {
      // Extract the D3 function name without the d3. prefix and ()
      const projId = proj.projection.replace("d3.", "").replace("()", "");
      projectionConfigs[projId] = {
        rotationX: proj.rotationX,
        rotationY: proj.rotationY,
        panX: proj.panX,
        panY: proj.panY,
        wheelY: proj.wheelY,
        maxPanOut: proj.maxPanOut,
        allowRotation: proj.allowRotation
      };
    });
    
    Logger.info('projectionConfigs', 'Successfully loaded projection configurations from JSON');
    return projectionConfigs;
  } catch (error) {
    Logger.error('projectionConfigs', 'Error loading projection configurations:', error);
    Logger.warn('projectionConfigs', 'Using fallback configuration instead');
    projectionConfigs = fallbackConfig;
    return projectionConfigs;
  }
}

/**
 * Gets the configuration for a specific projection
 * @param {string} projectionName - The name of the projection (D3 function name)
 * @returns {Object} The configuration for the projection, or the default configuration if not found
 */
export function getProjectionConfig(projectionName) {
  // If configs haven't been loaded yet, return fallback
  if (projectionConfigs === null) {
    Logger.warn('projectionConfigs', `Configuration not loaded yet, using fallback for ${projectionName}`);
    return fallbackConfig.default;
  }
  
  // Return the config for the projection, or the default if not found
  const config = projectionConfigs[projectionName];
  if (!config) {
    Logger.warn('projectionConfigs', `Configuration not found for ${projectionName}, using default`);
    return fallbackConfig.default;
  }
  
  return config;
}

/**
 * Gets the full list of available projections
 * @returns {Array} The list of projections
 */
export function getProjectionsList() {
  return projectionsList || [];
}

/**
 * Applies the configuration settings to a chart
 * @param {Object} chart - The chart to apply settings to
 * @param {Object} config - The configuration to apply
 * @returns {Object} The chart with applied settings
 */
export function applyProjectionConfig(chart, config) {
  Logger.debug('projectionConfigs', `Applying configuration:`, config);
  
  // Get the current projection
  const projection = chart.get("projection");
  
  // Apply all configuration settings to the chart
  Object.entries(config).forEach(([key, value]) => {
    if (key !== 'allowRotation') { // Skip non-chart properties
      chart.set(key, value);
    }
  });
  
  // Ensure proper scale and translation for the projection
  if (projection) {
    const projectionName = projection.name || "";
    
    if (projectionName.includes("AzimuthalEquidistant")) {
      // For AE projection
      projection.scale(chart.height() / 2)
               .translate([chart.width() / 2, chart.height() / 2]);
    } else {
      // For non-AE projections
      projection.scale(150)
               .translate([chart.width() / 2, chart.height() / 2]);
    }
  }
  
  return chart;
}

// Initialize by loading the configurations
loadProjectionConfigs().catch(error => {
  Logger.error('projectionConfigs', 'Failed to initialize projection configurations:', error);
});

export default {
  loadProjectionConfigs,
  getProjectionConfig,
  applyProjectionConfig,
  getProjectionsList
};
