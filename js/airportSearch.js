import { 
  getAirportList, 
  fetchAirportData,
  setAirportList 
} from './main.js';

let selectedAirportACode = '';
let selectedAirportBCode = '';

export function setSelectedAirportACode(code) {
  selectedAirportACode = code;
}

export function setSelectedAirportBCode(code) {
  selectedAirportBCode = code;
}

export function getSelectedAirportACode() {
  return selectedAirportACode;
}

export function getSelectedAirportBCode() {
  return selectedAirportBCode;
}

export async function initializeAirportSearch() {
  let airportList;

  const airportsData = await fetchAirportData();
  const airportAInput = document.getElementById('airport-a-filter-search');
  const airportBInput = document.getElementById('airport-b-filter-search');

  setAirportList(airportsData.map(airport => ({
    label: `${airport.name} (${airport.iata_code})`,
    value: airport.iata_code,
    country: airport.iso_country,
    countryfull: airport.country,  // added this as a step toward displaying full country names in airport pair tags
    lat: airport.latitude,
    lon: airport.longitude
  })));

  let awesompleteA = new Awesomplete(airportAInput, { minChars: 0 });
  let awesompleteB = new Awesomplete(airportBInput, { minChars: 0 });

  awesompleteA.input.addEventListener('awesomplete-selectcomplete', (event) => {
    airportList = getAirportList();
    const selectedAirport = airportList.find(airport => airport.label === event.text.value);
    awesompleteA.input.value = selectedAirport.label;
    selectedAirportACode = selectedAirport.value; 
    document.getElementById('info-message').textContent = ''; 
    setSelectedAirportACode(selectedAirport.value);
    document.getElementById('add-button').disabled = !(selectedAirportACode && selectedAirportBCode);
  });
  
  awesompleteB.input.addEventListener('awesomplete-selectcomplete', (event) => {
    airportList = getAirportList();
    const selectedAirport = airportList.find(airport => airport.label === event.text.value);
    awesompleteB.input.value = selectedAirport.label;
    selectedAirportBCode = selectedAirport.value; 
    document.getElementById('info-message').textContent = ''; 
    setSelectedAirportBCode(selectedAirport.value);
    document.getElementById('add-button').disabled = !(selectedAirportACode && selectedAirportBCode);
  });

  const setupAwesomplete = (awesompleteInstance, list) => {
    awesompleteInstance.list = list;
  };

  const updateAwesompleteList = (awesompleteInstance, countryCode) => {
    airportList = getAirportList();
    if (!airportList) {
      console.error('airportList is undefined');
      return;
    }
    let filteredAirports = airportList.filter(airport => airport.country === countryCode);
    setupAwesomplete(awesompleteInstance, filteredAirports.map(item => item.label));
  };          

  return {
    awesompleteA,
    awesompleteB,
    updateAwesompleteList
  };
}

