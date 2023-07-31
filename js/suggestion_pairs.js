import { locationPair } from './locationPairClass.js';

// Function to process the suggestions
/*
async function processSuggestions() {
  try {
    //console.log('Fetching suggestion pairs...');
    const response = await fetch('./data/suggestion_pairs.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      const suggestionPairs = await response.json();
      //console.log(suggestionPairs); 
      //console.log('Successfully fetched suggestion pairs:', suggestionPairs);

      document.getElementById('suggestions-button').addEventListener('click', () => {
        //console.log('Suggestions button clicked. Processing suggestion pairs...');
        locationPair.lastSuggestionPairs.forEach(pair => {
          //console.log('Removing suggestion pair:', pair);
          locationPair.removeLocationPair(pair, false); // pass false for shouldDisplay
        });
      
        locationPair.displayLocationPairs(locationPair.locationPairs); // display the pairs once after all have been removed
      
        suggestionPairs.forEach(pair => {

          //console.log(typeof pair.GreatCircleDistKm);  
          //console.log(typeof pair.RhumbLineDistKm); 

          const newPair = {
            airportAName: pair.airportAName,
            airportACode: pair.airportACode,
            airportACountry: pair.airportACountry,
            airportACountryFull: pair.airportACountryFull,
            airportALat: pair.airportALat,
            airportALon: pair.airportALon,
            airportBName: pair.airportBName,
            airportBCode: pair.airportBCode,
            airportBCountry: pair.airportBCountry,
            airportBCountryFull: pair.airportBCountryFull,
            airportBLat: pair.airportBLat,
            airportBLon: pair.airportBLon,
            GreatCircleDistKm: pair.GreatCircleDistKm,
            RhumbLineDistKm: pair.RhumbLineDistKm,
            isSuggested: true
          };

          if (!locationPair.locationPairs.find(
            storedPair => storedPair.airportACode === newPair.airportACode && storedPair.airportBCode === newPair.airportBCode
          )) {
            //console.log('Adding new suggestion pair:', newPair);
            locationPair.addLocationPair(newPair, true);
            locationPair.lastSuggestionPairs.push(newPair);
          }
        });
      });
    }
  } catch (error) {
    console.error('Error while fetching suggestion pairs:', error);
  }
}
*/
// Function to process the suggestions
async function processSuggestions() {
  try {
    const response = await fetch('./data/suggestion_pairs.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      const suggestionPairs = await response.json();

      locationPair.lastSuggestionPairs.forEach(pair => {
        locationPair.removeLocationPair(pair, false);
      });

      locationPair.displayLocationPairs(locationPair.locationPairs);

      suggestionPairs.forEach(pair => {
        const newPair = {
          id: pair.airportACode + "-" + pair.airportBCode,
          airportAName: pair.airportAName,
          airportACode: pair.airportACode,
          airportACountry: pair.airportACountry,
          airportACountryFull: pair.airportACountryFull,
          airportALat: pair.airportALat,
          airportALon: pair.airportALon,
          airportBName: pair.airportBName,
          airportBCode: pair.airportBCode,
          airportBCountry: pair.airportBCountry,
          airportBCountryFull: pair.airportBCountryFull,
          airportBLat: pair.airportBLat,
          airportBLon: pair.airportBLon,
          GreatCircleDistKm: pair.GreatCircleDistKm,
          RhumbLineDistKm: pair.RhumbLineDistKm,
          isSuggested: true
        };

        if (!locationPair.locationPairs.find(
          storedPair => storedPair.airportACode === newPair.airportACode && storedPair.airportBCode === newPair.airportBCode
        )) {
          locationPair.addLocationPair(newPair, true);
          locationPair.lastSuggestionPairs.push(newPair);
        }
      });
    }
  } catch (error) {
    console.error('Error while fetching suggestion pairs:', error);
  }
}


window.addEventListener('DOMContentLoaded', async () => {

  /*********************************** */
  // Process the suggestions when the page loads
  await processSuggestions();

  // Set up the 'suggestions-button' click event listener
  document.getElementById('suggestions-button').addEventListener('click', processSuggestions);

  // Trigger the 'make-maps-button' click event after processing the suggestions
  document.getElementById('make-maps-button').click();

  /*********************************** */

});
