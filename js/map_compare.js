import { mapComparison } from './mapComparisonDisplay.js';

/*******************************************************************************/
/*                 Load & Populate the two dropdown boxes                       /
/*******************************************************************************/
await mapComparison.loadSuggestionPairs();
mapComparison.populateAirportDropdown();
mapComparison.populateProjectionDropdown();


// Initialize the maps by calling createMap function for both orthographic and projection maps
// Assumed div IDs are 'chartdiv_orthographic_c' and 'chartdiv_projection_c', update as per your actual HTML
// Also assumed projection names "geoOrthographic" and "geoMercator", update as necessary
const orthoMapInit = mapComparison.createMap('geoOrthographic', 'chartdiv_orthographic_c');
const projMapInit = mapComparison.createMap('geoMercator', 'chartdiv_projection_c');

// You can await these promises if needed or handle errors
Promise.all([orthoMapInit, projMapInit])
    .then(results => {
        // Do something after both maps are initialized
        //console.log("Both maps are initialized.", results);

        // Now that everything is ready, initialize other parts of the map comparison
        mapComparison.initialize();
    })
    .catch(error => {
        console.error("Failed to initialize maps: ", error);
    });


/*******************************************************************************/
/*                             Tippy Tooltips                                  */
/*******************************************************************************/
tippy('#GC_RL_info-icon', {
    content: `<div style="font-size: 14px;">
                <strong>Welcome to the Great Circle & Rhumb Line Comparator!</strong><br>
                <ul style="margin-top: 10px;">
                    <li><em>Objective:</em> Visualize how Great Circles and Rhumb Lines appear on a 3D globe and compare them with 2D map projections.</li>
                    <li><em>Interactive Globe:</em> Rotate the Orthographic globe to see Great Circles as the shortest routes between two locations.</li>
                    <li><em>Side-by-Side Comparison:</em> Observe the distortion in 2D map projections by comparing them with the 3D globe.</li>
                    <li><em>How to Use:</em>
                        <ul style="margin-top: 5px;">
                            <li>Select a new airport pair from the dropdown (e.g., "LAX-DXB").</li>
                            <li>Change the 2D map projection from the projection dropdown (e.g., Mercator).</li>
                            <li>Hover your mouse pointer over the airport locations, Great Circle & Rhumb Lines to get more information including the distances.</li>
                        </ul>
                    </li>
                </ul>
              </div>`,
    allowHTML: true,
    placement: 'right'
});

tippy('#GC_RL_Explainer-info-icon', {
    content: `<div style="font-size: 14px;">
                <strong>What are Great Circle and Rhumb Lines?</strong><br>
                <ul style="margin-top: 10px;">
                    <li><em>Great Circles:</em> 
                        <ul>
                            <li>Shortest distances between any two points on a sphere.</li>
                            <li>Divide the Earth into two equal hemispheres.</li>
                            <li>Examples include the Equator and lines of longitude.</li>
                            <li>Lines of latitude north or south of the Equator are not Great Circles.</li>
                            <li>Complex to navigate, especially near the poles, due to changing course headings in relation to latitude and longitude.</li>
                        </ul>
                    </li>
                    <li><em>Rhumb Lines:</em>
                        <ul>
                            <li>Courses with a constant heading or bearing.</li>
                            <li>Easy to navigate.</li>
                            <li>Cross all lines of latitude and longitude at the same angle.</li>
                            <li>Useful for short distances.</li>
                            <li>For longer distances, can be significantly longer than Great Circle routes.</li>
                        </ul>
                    </li>
                </ul>
              </div>`,
    allowHTML: true,
    placement: 'right'
});



      
/*******************************************************************************/
/*        Event Listeners - All functions via the mapComparison class           /
/*******************************************************************************/
/*
document.addEventListener('DOMContentLoaded', (event) => {
    mapComparison.handleAirportSelection("HBA-QET");
    mapComparison.handleProjectionSelection("Geo Mercator");
});
*/

document.getElementById('selector-oc-1').addEventListener('change', function() {
    mapComparison.handleAirportSelection(this.value);
});

document.getElementById('selector-oc-2').addEventListener('change', function() {
    mapComparison.handleProjectionSelection(this.value);
});

document.getElementById("selector-prev-oc-1").addEventListener("click", function() {
    mapComparison.setIndex(-1);
});

document.getElementById("selector-next-oc-1").addEventListener("click", function() {
    mapComparison.setIndex(1);
});

document.getElementById("selector-prev-oc-2").addEventListener("click", function() {
    mapComparison.setIndex(-1, "oc-2"); 
});

document.getElementById("selector-next-oc-2").addEventListener("click", function() {
    mapComparison.setIndex(1, "oc-2"); 
});

