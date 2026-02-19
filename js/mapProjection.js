// mapProjection.js

import { loadProjectionConfig, getConfigCache, applyProjectionConfig } from './projectionConfig.js';

export let currentProjectionName = "geoMercator";

export function updateProjectionName(newName) {
    currentProjectionName = newName;
}

// Function to update the map projection using the unified config
export function updateProjection(chart, d3Name) {
    applyProjectionConfig(chart, d3Name);
}


export async function setupProjectionDropdown(chart) {
    var projectionSelect = document.getElementById('projectionSelect');
    projectionSelect.innerHTML = "";

    // Load config (uses cache if already loaded)
    const data = await loadProjectionConfig();

    // Sort by id and populate dropdown
    const sorted = [...data].sort((a, b) => a.id - b.id);
    for (var i = 0; i < sorted.length; i++) {
        if (sorted[i].showInDropdown === false) continue;

        var option = document.createElement("option");
        option.text = sorted[i].name;
        option.value = sorted[i].d3Name;

        // Set the default selection to Mercator
        if (sorted[i].d3Name === 'geoMercator') {
            option.selected = true;
        }

        projectionSelect.add(option);
    }

    projectionSelect.addEventListener('change', function() {
        const selectedD3Name = projectionSelect.value;

        updateProjection(chart, selectedD3Name);
        updateProjectionName(selectedD3Name);
    });
}
