// projectionConfig.js
// Single source of truth for projection configuration.
// Loads projections.json once, caches it, and provides a unified
// applyProjectionConfig() function that all code paths should use.

let _configCache = null;

export async function loadProjectionConfig() {
    if (_configCache) return _configCache;
    const response = await fetch('./data/projections.json');
    _configCache = await response.json();
    return _configCache;
}

export function getConfigCache() {
    return _configCache;
}

export function getConfigByD3Name(d3Name) {
    if (!_configCache) return null;
    return _configCache.find(p => p.d3Name === d3Name) || null;
}

export function getConfigById(id) {
    if (!_configCache) return null;
    return _configCache.find(p => p.id === id) || null;
}

// Full state reset + apply config from JSON for a given d3Name.
// This is THE single function all code paths should call when switching projections.
// It ensures no properties leak from a previous projection.
export function applyProjectionConfig(chart, d3Name) {
    const config = getConfigByD3Name(d3Name);
    if (!config) {
        console.error(`projectionConfig: no config found for "${d3Name}"`);
        return false;
    }

    const projectionFn = d3[d3Name];
    if (typeof projectionFn !== 'function') {
        console.error(`projectionConfig: d3.${d3Name} is not a function`);
        return false;
    }

    // Create a fresh D3 projection instance
    const projection = projectionFn();

    // --- Full state reset ---
    // Neutralize the OLD projection's D3 rotation before installing the new one.
    // amCharts' internal center-preservation (prev.invert → projection → translate)
    // produces Infinity values if the old projection was pole-centered (e.g., AE rotationY=-90)
    // and the new projection can't represent poles (e.g., Mercator).
    const oldProjection = chart.get("projection");
    if (oldProjection && oldProjection.rotate) {
        oldProjection.rotate([0, 0, 0]);
    }
    chart.set("rotationX", 0);
    chart.set("rotationY", 0);
    chart.set("projection", projection);
    chart.set("panX", "none");
    chart.set("panY", "none");
    chart.set("wheelY", "none");
    chart.set("wheelX", "none");
    chart.set("maxPanOut", 0);

    // --- Apply config from JSON ---
    chart.set("panX", config.panX);
    chart.set("panY", config.panY);
    chart.set("wheelY", config.wheelY);
    chart.set("rotationX", config.rotationX);
    chart.set("rotationY", config.rotationY);
    chart.set("maxPanOut", config.maxPanOut);

    // For azimuthal projections, use goHome after a short delay to fix centering
    if (config.family === "azimuthal") {
        setTimeout(() => { chart.goHome(); }, 100);
    } else {
        chart.appear(1000, 100);
    }

    return true;
}

// Apply orthographic (globe) projection using amCharts wrapper — NOT D3.
// Returns the amCharts projection object for save/restore.
export function applyOrthographic(chart) {
    const projection = am5map.geoOrthographic();
    chart.set("projection", projection);
    chart.set("panX", "rotateX");
    chart.set("panY", "rotateY");
    chart.set("wheelY", "rotateY");
    chart.set("wheelX", "none");
    chart.set("wheelSensitivity", 0.3);
    chart.set("rotationX", 0);
    chart.set("rotationY", 0);
    chart.set("maxPanOut", 0);
    chart.goHome();
    return projection;
}
