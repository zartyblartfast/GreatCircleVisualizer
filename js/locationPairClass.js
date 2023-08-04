//import LatLon from 'https://cdn.jsdelivr.net/npm/geodesy@2.4.0/latlon-spherical.min.js';

export class LocationPair {
  constructor() {
    this.locationPairs = JSON.parse(localStorage.getItem('locationPairs')) || [];
    this.lastSuggestionPairs = [];
    this.userAddedPairs = [];

    // Bind the methods to 'this'
    this.addLocationPair = this.addLocationPair.bind(this);
    this.removeLocationPair = this.removeLocationPair.bind(this);
    this.displayLocationPairs = this.displayLocationPairs.bind(this);

    //this.changeLineColor = this.changeLineColor.bind(this);
  }

    addLocationPair(pair, isSuggested) {
      //console.log('addLocationPair called with pair:', pair, 'and isSuggested:', isSuggested);
      
      pair.isSuggested = isSuggested || false;
      this.locationPairs.push(pair);

      if (!pair.isSuggested) {
          // Fetch the existing pairs from local storage.
          let existingPairs = JSON.parse(localStorage.getItem('locationPairs')) || [];

          // Add the new pair to the existing pairs.
          existingPairs.push(pair);
          
          // Update the userAddedPairs property and local storage.
          this.userAddedPairs = existingPairs;
          localStorage.setItem('locationPairs', JSON.stringify(this.userAddedPairs));
          
          //console.log('addLocationPair isSuggested = false');
      } else {
          //console.log('addLocationPair isSuggested = true');
      }

      this.displayLocationPairs(this.locationPairs);

      // Update window.globalLocationPair
      window.globalLocationPair.locationPairs = this.locationPairs;

      // Dispatch the event
      //console.log('Dispatching locationPairsChanged event');
      window.dispatchEvent(new CustomEvent('locationPairsChanged'));
    }


    removeLocationPair(pairOrElement) {
      //console.log('removeLocationPair called with:', pairOrElement);
      let pair;
      if (pairOrElement instanceof HTMLElement) { // if an HTMLElement was passed
          const index = pairOrElement.dataset.index;
          pair = this.locationPairs[index]; // Retrieve the pair object instead of creating a new one
      } else { // if a pair object was passed
          pair = pairOrElement;
      }
  
      const index = this.locationPairs.findIndex(
          storedPair => storedPair.airportACode === pair.airportACode && storedPair.airportBCode === pair.airportBCode
      );
      //console.log('removeLocationPair fn - index :' + index);
      //console.log('removeLocationPair found pair at index:', index, 'pair:', pair);
  
      if (index !== -1) {
          this.locationPairs.splice(index, 1);
          // only write to local storage if the pair isn't a suggested pair
          if (!pair.isSuggested) {
              localStorage.setItem('locationPairs', JSON.stringify(this.locationPairs));
          }
          this.displayLocationPairs(this.locationPairs);
      }
  
      // Update window.globalLocationPair
      window.globalLocationPair.locationPairs = this.locationPairs;

      // Dispatch the event
      window.dispatchEvent(new CustomEvent('locationPairsChanged'));
    }
  

    /*
    changeLineColor(lineSeries, lineId, color) {
      try {
        let lineDataItem = lineSeries.dataItems[lineId]; // Getting the line data item by id
        lineDataItem.mapLine.set("stroke", color); // Changing the line color
      } catch (error) {
        console.error("Error in changeLineColor:", error);
      }
    }
    */

  displayLocationPairs() {
    //console.log('displayLocationPairs called with:', this.locationPairs);
    //const locationPairTags = document.getElementById('location-pair-tags');
    const locationPairTags = document.querySelector('.location-pair-tags-container');
    locationPairTags.innerHTML = '';
    this.locationPairs.forEach((pair, index) => {
      const tag = document.createElement('div');
      tag.classList.add('tag');
  
      //console.log('displayLocationPairs - isSuggested:', pair.isSuggested);
      //console.log("pair: ", pair)

      // add the id attribute to the tag
      tag.setAttribute('id', pair.id);

      // if pair is a suggested one, add a 'suggested' class to the tag
      if (pair.isSuggested) {
        tag.classList.add('suggested');
      }
  
      tag.dataset.index = index;
  
      const mainContent = document.createElement('div');
      mainContent.classList.add('main-content');
      tag.appendChild(mainContent);
  
      const mainLabel = document.createElement('span');
       
      if (pair.isSuggested) {
        mainLabel.textContent = `Suggested: ${pair.airportACode} - ${pair.airportBCode}`;
      } else {
        mainLabel.textContent = `${pair.airportACode} - ${pair.airportBCode}`;
      }
      mainContent.appendChild(mainLabel);
  
      const deleteButtonWrapper = document.createElement('div');
      deleteButtonWrapper.classList.add('delete-button-wrapper');
      mainContent.appendChild(deleteButtonWrapper);
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'x';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeLocationPair(tag);
      });
      deleteButtonWrapper.appendChild(deleteButton);

    // Calculate the percentage difference
    const greatCircleDist = parseFloat(pair.GreatCircleDistKm);
    const rhumbLineDist = parseFloat(pair.RhumbLineDistKm);
    const percentageDifference = ((rhumbLineDist - greatCircleDist) / greatCircleDist) * 100;

    // Include the sign in the percentage difference
    let signedPercentageDifference;
    if (Math.abs(percentageDifference) < 0.005) { // If the absolute value of the percentage difference is less than 0.005
      signedPercentageDifference = '~0';
    } else {
      signedPercentageDifference = percentageDifference > 0 ? `+${percentageDifference.toFixed(2)}` : percentageDifference.toFixed(2);
    }

    console.log("displayLocationPair - pair:", pair)
    
    const additionalInfo = document.createElement('div');
    additionalInfo.classList.add('additional-info');
    additionalInfo.innerHTML = 
    `<div class="tag-content">
      <div class="header">
        <hr class="separator">
        <span class="airport-name";">${pair.airportAName} (${pair.airportACode})</span>
      </div>
      <div class="airport-info">
        <p>Country: ${pair.airportACountryFull}</p>
        <p>Latitude: ${pair.airportALat}</p>
        <p>Longitude: ${pair.airportALon}</p>
      </div>
      <div class="header">
        <hr class="separator">
        <span class="airport-name";">${pair.airportBName} (${pair.airportBCode})</span>
      </div>
      <div class="airport-info">
        <p>Country: ${pair.airportBCountryFull}</p>
        <p>Latitude: ${pair.airportBLat}</p>
        <p>Longitude: ${pair.airportBLon}</p>
      </div>
      <div class="header">
        <hr class="separator">
        <span class="distance-info">Distances (km):</span>
      </div>
      <div class="distance-info">
        <p>Great Circle: ${pair.GreatCircleDistKm.toFixed(1)}</p>
        <p>Rhumb Line: ${pair.RhumbLineDistKm.toFixed(1)} (${signedPercentageDifference}%)</p>
      </div>
    </div>`
  
      tag.appendChild(additionalInfo);

      tag.addEventListener('click', () => {
        // Collapse all other tags
        const allTags = Array.from(locationPairTags.children);
        allTags.forEach(otherTag => {
          if (otherTag !== tag && otherTag.classList.contains('expanded')) {
            otherTag.style.maxHeight = '30px';
            otherTag.classList.remove('expanded');
      
            // Enable the delete button for the collapsed tag
            const otherDeleteButton = otherTag.querySelector('.delete-button-wrapper button');
            otherDeleteButton.disabled = false;


            // Dispatch a custom event with the id of the collapsed pair
            const pairId = otherTag.getAttribute('id');
            const event = new CustomEvent('pairExpandCollapse', { detail: { pairId: pairId, expanded: false } });
            document.dispatchEvent(event);
      
            console.log(`pairExpandCollapse event - pairId: ${pairId}, expanded: false`);
          }
        });
      
        // If the tag is already expanded, collapse it
        if (tag.classList.contains('expanded')) {
          tag.style.maxHeight = '30px';
          deleteButton.disabled = false; // Enable delete button when tag is collapsed

          const pairId = tag.getAttribute('id');
          const event = new CustomEvent('pairExpandCollapse', { detail: { pairId: pairId, expanded: false } });
          document.dispatchEvent(event);
      
          //console.log(`pairExpandCollapse event - pairId: ${pairId}, expanded: false`);
        } else {
          // If the tag is not expanded, expand it
          // Use setTimeout to ensure the additional info is rendered before calculating the scroll height
          setTimeout(() => {
            const additionalInfo = tag.querySelector('.additional-info');
            tag.style.maxHeight = `${30 + additionalInfo.scrollHeight}px`;
            deleteButton.disabled = true; // Disable delete button when tag is expanded

            const pairId = tag.getAttribute('id');
            
            // Dispatch a custom event with the id of the expanded pair
            const event = new CustomEvent('pairExpandCollapse', { detail: { pairId: pairId, expanded: true } });
            document.dispatchEvent(event);
      
            //console.log(`pairExpandCollapse event - pairId: ${pairId}, expanded: true`);
          }, 0);
        }
        tag.classList.toggle('expanded');
      });
      
      locationPairTags.appendChild(tag);
    });
  }  
}


/*
 * Access the global instance of LocationPair.
 * 
 * The LocationPair class is normally exported from locationPairClass.js and imported into other files as a module.
 * However, due to the limitations of the current environment where this script (map_animations_along_lines.js) is running,
 * ES6 module imports are not supported. As a workaround, an instance of LocationPair is attached to the window object
 * in locationPairClass.js, effectively making it a global variable that can be accessed in this file.
 * 
 * This allows us to use the LocationPair class in this file without changing the way it's accessed in other parts of the codebase.
 * Please note that this is a workaround specific to the current environment and may not be necessary if ES6 module imports are supported in the future.
 */ 
//window.globalLocationPair = new LocationPair();
const instance = new LocationPair();
export const locationPair = instance;
window.globalLocationPair = instance;