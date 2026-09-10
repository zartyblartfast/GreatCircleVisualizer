// mapProjection.js

import { loadProjectionConfig, getConfigCache, applyProjectionConfig } from './projectionConfig.js';

export let currentProjectionName = "geoEqualEarth";

export function updateProjectionName(newName) {
    currentProjectionName = newName;
}

// Function to update the map projection using the unified config
export function updateProjection(chart, d3Name, isCurrent = () => true) {
    applyProjectionConfig(chart, d3Name, null, isCurrent);
}


export async function setupProjectionDropdown(chart, onProjectionChange = null) {
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

        // Set the dropdown to the configured default projection
        if (sorted[i].d3Name === currentProjectionName) {
            option.selected = true;
        }

        projectionSelect.add(option);
    }

    projectionSelect.onchange = async function() {
        const selectedD3Name = projectionSelect.value;
        updateProjectionName(selectedD3Name);
        if (onProjectionChange) {
            await onProjectionChange(selectedD3Name);
        } else {
            updateProjection(chart, selectedD3Name);
        }
    };
}
