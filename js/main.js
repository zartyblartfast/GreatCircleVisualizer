//export let locationPairs = JSON.parse(localStorage.getItem('locationPairs')) || [];

// copied from airportList.js for restructuring
export let airportList = [];

export function setAirportList(newAirportList) {
    airportList = newAirportList;
}
  
export function getAirportList() {
  return airportList;
}

export async function fetchCountryData() {
    const response = await fetch('./data/country-codes.json');
    const data = await response.json();
    return data;
}

export async function fetchAirportData() {
  const response = await fetch('./data/airports.json');
  const data = await response.json();
  return data;
}

/*
export async function initializeApp() {
  const countryData = await fetchCountryData();
  const airportData = await fetchAirportData();
  
  // Assuming that airportData is the data you want to store in airportList
  setAirportList(airportData);
  
  // Any other initialization code goes here
}
*/