// mapProjection.js

export let currentProjectionName = "geoMercator";

export function updateProjectionName(newName) {
    currentProjectionName = newName;
}

// Function to update the map projection
export function updateProjection(chart, projectionName, isRotatable) {

    //console.log("in updateProjection fu, isRotatable arg: ",isRotatable )

    if (isRotatable === undefined) {
        isRotatable = false;
    }

    //console.log("in updateProjection, after reset, isRotatable arg: ",isRotatable )
    //try {
        // Remove "d3." from the start of the projectionName and the parentheses at the end
        let projectionFunctionName = projectionName.slice(3, -2);

        // Get the projection function from the D3 object
        let projectionFunction = d3[projectionFunctionName];

        // Check if the projection function exists
        if (typeof projectionFunction === 'function') {
            // Special case for geoAzimuthalEquidistant projection
            //let newProjection = projectionFunction().rotate([0, -90, 0]);
            // Update the chart's projection with the new projection object
            //chart.set("projection", newProjection);
            //console.log("typeof projectFunction === function")
           
            chart.set("projection", projectionFunction());
            //if (projectionFunctionName === 'geoAzimuthalEquidistant') {
             if  (isRotatable === true) {

                //console.log("In updateProject, isRotatable === true");

                //let newProjection = projectionFunction().rotate([0, -90, 0]);
                //chart.set("projection", newProjection);

                //chart.set("projection", projectionFunction());
                //chart.get("projection").rotate([0, -90, 0]);
            
                //var projection = chart.get("projection");
                //var point = projection([0, 90]);
                //console.log("point: ", point);
            
                chart.set("panX", "rotateX")
                //chart.set("panY", "rotateY")
                chart.set("panY", "none")
                //chart.set("minWidth", 200); // minimum width in pixels
                //chart.set("minHeight", 200); // minimum height in pixels
                chart.set("rotationY", 1);
                chart.set("wheelY","rotateY")
                //chart.appear(1000, -10);
            } else {
                //console.log("In updateProject, isRotatable === false");
                //chart.set("projection", projectionFunction());
                chart.appear(1000, 100);
                chart.set("panX", "rotateX")
                //chart.set("panY", "translateY")
                chart.set("panY", "none")
                chart.set("rotationY", 0);
                chart.set("wheelY","none")
                //chart.appear(1000, -10);
                //chart.set("minWidth", 200); // minimum width in pixels
                //chart.set("minHeight", 200); // minimum height in pixels
                //console.log("typeof projectFunction === function, chart: ",chart)
            }
          
        } else {
            console.error(`Failed to update projection: No projection function found for ${projectionName}`);
        }
    //} catch (error) {
    //    console.error(`Failed to update projection: ${error}`);
    //}
    //chart.invalidateData();
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
        .catch(error => console.error('Error:', error));

    projectionSelect.addEventListener('change', function() {
        const selectedProjection = projectionSelect.value;
        const isRotatable = projectionSelect.options[projectionSelect.selectedIndex].dataset.rotatable === 'true';

        //console.log("projectionSelect.value: ", projectionSelect.value);
        //console.log("projectionSelect, isRotatable : ", isRotatable);

        updateProjection(chart, selectedProjection, isRotatable);

        // Update currentProjectionName
        updateProjectionName(selectedProjection.slice(3, -2));
    });
}
