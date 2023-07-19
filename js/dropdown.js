//import { fetchCountryData } from './dataLoader.js';
import { fetchCountryData } from './main.js';
import { initializeAirportSearch } from './airportSearch.js';
import { setSelectedAirportACode, setSelectedAirportBCode } from './airportSearch.js';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const countryData = await fetchCountryData();
    const countryADropdown = document.getElementById('country-a-dropdown');
    const countryBDropdown = document.getElementById('country-b-dropdown');

    // Placeholder options
    const placeholderOptionA = document.createElement('option');
    placeholderOptionA.text = "Select country...";
    placeholderOptionA.value = "";
    placeholderOptionA.disabled = true;
    placeholderOptionA.selected = true;

    const placeholderOptionB = document.createElement('option');
    placeholderOptionB.text = "Select country...";
    placeholderOptionB.value = "";
    placeholderOptionB.disabled = true;
    placeholderOptionB.selected = true;

    // Add placeholder options to dropdowns
    countryADropdown.add(placeholderOptionA);
    countryBDropdown.add(placeholderOptionB);

    Object.entries(countryData).forEach(([country, code]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = country;
      countryADropdown.appendChild(option);
      countryBDropdown.appendChild(option.cloneNode(true));
    });

    const { awesompleteA, awesompleteB, updateAwesompleteList } = await initializeAirportSearch();
    
    countryADropdown.addEventListener('change', () => {
      if (countryADropdown.value) {
        document.getElementById('airport-a-filter-search').disabled = false;
        document.getElementById('airport-a-filter-search').value = '';
        //selectedAirportACode = '';
        setSelectedAirportACode(''); 
        updateAwesompleteList(awesompleteA, countryADropdown.value);
        document.getElementById('info-message').textContent = '';
        // Disable the 'Add' button when the country is changed
        document.getElementById('add-button').disabled = true;
      } else {
        document.getElementById('airport-a-filter-search').disabled = true;
      }
    });
    
    countryBDropdown.addEventListener('change', () => {
      if (countryBDropdown.value) {
        document.getElementById('airport-b-filter-search').disabled = false;
        document.getElementById('airport-b-filter-search').value = '';
        //selectedAirportBCode = '';
        setSelectedAirportBCode('');
        updateAwesompleteList(awesompleteB, countryBDropdown.value);
        document.getElementById('info-message').textContent = '';
        document.getElementById('add-button').disabled = true;
      } else {
        document.getElementById('airport-b-filter-search').disabled = true;
      }
    });
    
    

    countryADropdown.dispatchEvent(new Event('change'));
    countryBDropdown.dispatchEvent(new Event('change'));

  } catch (error) {
    console.error(error);
  }
});

