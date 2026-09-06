import { 
  getAirportList, 
  fetchAirportData,
  setAirportList 
} from './main.js';

let selectedAirportACode = '';
let selectedAirportBCode = '';

function getAirportSearchParts(item) {
  const label = String(item.label || item.value || item || '');
  const codeMatch = label.match(/\(([A-Z0-9]+)\)$/i);
  const code = codeMatch ? codeMatch[1].toLowerCase() : '';
  const name = label.replace(/\s*\([^)]+\)$/, '').toLowerCase();
  return { label, name, code };
}

export function getAirportSearchRank(item, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return 0;

  const { label, name, code } = getAirportSearchParts(item);
  if (code === normalizedQuery) return 0;
  if (code.startsWith(normalizedQuery)) return 1;
  if (name.startsWith(normalizedQuery)) return 2;
  if (name.split(/\s+/).some(word => word.startsWith(normalizedQuery))) return 3;
  if (name.includes(normalizedQuery)) return 4;
  if (label.toLowerCase().includes(normalizedQuery)) return 5;
  return 6;
}

export function sortAirportSuggestions(a, b, query) {
  const rankA = getAirportSearchRank(a, query);
  const rankB = getAirportSearchRank(b, query);
  if (rankA !== rankB) return rankA - rankB;

  const partsA = getAirportSearchParts(a);
  const partsB = getAirportSearchParts(b);
  return partsA.name.localeCompare(partsB.name) || partsA.code.localeCompare(partsB.code);
}

function createAirportSuggestionSorter(inputElement) {
  return (a, b) => sortAirportSuggestions(a, b, inputElement.value);
}

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

  let awesompleteA = new Awesomplete(airportAInput, {
    minChars: 0,
    maxItems: 40,
    sort: createAirportSuggestionSorter(airportAInput)
  });
  let awesompleteB = new Awesomplete(airportBInput, {
    minChars: 0,
    maxItems: 40,
    sort: createAirportSuggestionSorter(airportBInput)
  });

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

  /*
  const updateAwesompleteList = (awesompleteInstance, countryCode) => {
    airportList = getAirportList();
    if (!airportList) {
      console.error('airportList is undefined');
      return;
    }
    let filteredAirports = airportList.filter(airport => airport.country === countryCode);
    setupAwesomplete(awesompleteInstance, filteredAirports.map(item => item.label));
  };          
  */
  const updateAwesompleteList = (awesompleteInstance, countryCode) => {
    airportList = getAirportList();
    if (!airportList) {
      //console.error('airportList is undefined');
      return;
    } 

    let filteredAirports = airportList;
  
    // Check if countryCode is present; if so, filter by country
    if (countryCode) {
      filteredAirports = airportList.filter(airport => airport.country === countryCode);
    }
    
    setupAwesomplete(awesompleteInstance, filteredAirports.map(item => item.label));
  };
  
  
  return {
    awesompleteA,
    awesompleteB,
    updateAwesompleteList
  };
}

