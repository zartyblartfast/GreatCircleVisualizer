import { getAirportList } from './main.js';
import { setSelectedAirportACode, setSelectedAirportBCode, getSelectedAirportACode, getSelectedAirportBCode } from './airportSearch.js';
import { locationPair } from './locationPairClass.js';
import LatLon from 'https://cdn.jsdelivr.net/npm/geodesy@2.4.0/latlon-spherical.min.js';

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-button').disabled = true;

    document.getElementById('add-button').addEventListener('click', () => {
      const airportList = getAirportList();
      
      //console.log("airportList: ", airportList)

      const airportA = airportList.find(airport => airport.value === getSelectedAirportACode());
      const airportB = airportList.find(airport => airport.value === getSelectedAirportBCode());

      //console.log('Selected airports:', airportA, airportB);

      console.log("airportB countryfull: ", airportB.countryfull)

      document.getElementById('info-message').textContent = '';
  
      if (!airportA || !airportB) {
        console.log('Could not find selected airports');
        document.getElementById('info-message').textContent = 'Please select both airports before adding';
        return;
      }
  
      const newPair = {
        airportAName: airportA.label.split(' (')[0],
        airportACode: airportA.value,
        airportALat: airportA.lat,
        airportALon: airportA.lon,
        airportACountry: airportA.country,
        airportACountryFull: airportA.countryfull,
        airportBName: airportB.label.split(' (')[0],
        airportBCode: airportB.value,
        airportBLat: airportB.lat,
        airportBLon: airportB.lon,
        airportBCountry: airportB.country,
        airportBCountryFull: airportB.countryfull,
        isSuggested: false
      };      
  
      // Calculate distances
      const p1 = new LatLon(newPair.airportALat, newPair.airportALon);
      const p2 = new LatLon(newPair.airportBLat, newPair.airportBLon);
      const d = p1.distanceTo(p2) / 1000;  // in kilometers
      const r = p1.rhumbDistanceTo(p2) / 1000;  // in kilometers

      // Add distances to the newPair object
      newPair.GreatCircleDistKm = d;
      newPair.RhumbLineDistKm = r;

      console.log('User added a new pair:', newPair);
      locationPair.addLocationPair(newPair, false);
      
      document.getElementById('airport-a-filter-search').value = '';
      document.getElementById('country-a-dropdown').value = '';
      document.getElementById('airport-b-filter-search').value = '';      
      document.getElementById('country-b-dropdown').value = '';

      document.getElementById('airport-a-filter-search').disabled = true;
      document.getElementById('airport-b-filter-search').disabled = true;

      document.getElementById('add-button').disabled = true;

        // After adding the new pair, clear the selected airports
      setSelectedAirportACode('');
      setSelectedAirportBCode('');
      
    });
  
    locationPair.displayLocationPairs(locationPair.locationPairs);
});
