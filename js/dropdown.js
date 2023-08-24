//import { fetchCountryData } from './dataLoader.js';
import { fetchCountryData } from './main.js';
import { initializeAirportSearch } from './airportSearch.js';
import { setSelectedAirportACode, setSelectedAirportBCode } from './airportSearch.js';

window.addEventListener('DOMContentLoaded', async () => {
  tippy('#add-tags-header-icon', {
    content: `
      <strong>Getting Started:</strong>
      <ul>
        <li>Each <span style="font-weight: bold;">"Airport Pair Tag"</span> is represented by a Great Circle line on the maps.</li>
        <li><span style="color: green;">Suggested Airport Pair Tags</span> are automatically generated for your convenience.</li>
      </ul>
      <strong>Next Steps:</strong>
      <ul>
        <li>If you wish to plot custom Great Circle routes, simply add your chosen <span style="font-weight: bold;">Airport A & B</span> pair.</li>
        <li>Afterwards, click the <span style="color: red;">[Update Flight Paths]</span> button to refresh the map display.</li>
      </ul>
    `,
    placement: 'right',
    allowHTML: true  // This option is essential for rendering HTML inside the tooltip
  });
  
  tippy('.country-b-info', {
    content: '<span style="font-weight: bold;">Country Dropdown List</span><br>Optional: Use this only if you want to narrow down your search for Airport A and/or B.',
    allowHTML: true,
    placement: 'right'
  });
  
  tippy('.airport-b-info', {
    content: '<span style="font-weight: bold;">Add Your Own Airport Pairs</span><ul><li><span style="font-weight: bold;">Required:</span> Use any identifying text like partial city names, airport codes, etc., to search for airports.</li><li><span style="font-weight: bold;">Both Airports:</span> Must input both Airport A & B.</li><li><span style="font-weight: bold;">Action:</span> Click the [Add] button to create an "Airport Pair Tag".</li></ul>',
    allowHTML: true,
    placement: 'right'
  });
  
  tippy('#add-button-icon', {
    content: '<span style="font-weight: bold;">Add New Airport Pair Tag</span><br>After selecting Airport A & B, click this button to add them as a new "Airport Pair Tag".',
    allowHTML: true,
    placement: 'right'
  });
  
  tippy('#suggestions-button-icon', {
    content: '<div style="font-weight: bold;">Suggested Airport Pair Tags</div><ul><li><span style="font-weight: bold;">Automatic Display:</span> Suggestions appear every time you open the page.</li><li><span style="font-weight: bold;">Deleted Suggestions:</span> Click to recreate any deleted suggested tags.</li></ul>',
    allowHTML: true,
    placement: 'right'
  });
  

  tippy('#make-maps-button', {
    content: '<div style="font-weight: bold;">Update Great Circle Paths</div><ul><li><span style="font-weight: bold;">After Adding/Removing Airport Pair Tags:</span> Update the paths on the map.</li><li><span style="font-weight: bold;">Suggested Airport Pair Tags:</span> Can also be added or removed before updating.</li></ul><p style="color: red;">Click this button to finalize your selections and update the maps!</p>',
    allowHTML: true,
    placement: 'right'
  });

  tippy('#tags-header-icon', {
    content: '<div style="font-weight: bold;">Airport Pair Tags</div><ul><li><span style="font-weight: bold;">[Add] button:</span> Add your own selected airport pairs.</li><li><span style="font-weight: bold;">[Suggestions] button:</span> Adds "suggested airport pairs".</li><li><span style="font-weight: bold;">Click on an [Airport Pair Tag]:</span> To expand it and view more information.</li><li><span style="font-weight: bold;">Highlighted Great Circle route:</span> Appears on the maps.</li></ul><p>Your own selected airport tags will be saved for your next visit.</p><p style="color: red;">To remove any airport pair tags, click the "x" and then click the <span style="font-weight: bold;">[Update Flight Paths]</span> button.</p>',
    allowHTML: true,
    placement: 'right'
  });
  
  tippy('#info-icon', {
    content: `<strong>Map Projections:</strong>
        <ul>
          <li>Select from various map projections using the dropdown.</li>
          <li>Understand how different projections can distort Earth's 3D surface.</li>
        </ul>
        <strong>Great Circles:</strong>
        <ul>
          <li>Visualize how Great Circles may appear distorted due to the map projection.</li>
          <li>Learn that Great Circles are the largest circles that can be drawn on a sphere, effectively cutting it into two equal hemispheres. In the context of Earth, which is an oblate spheroid, great circles serve as an approximation for the shortest routes between two points.</li>
          <li>Recognize that all lines of longitude and the equator are examples of Great Circles.</li>
        </ul>
        <strong>Additional Tips:</strong>
        <ul>
          <li>Switch to 'globe' on the [selector] for a 3D perspective.</li>
          <li>To revert to 2D maps, choose 'maps' on the [selector].</li>
          <li><em>Note:</em> If maps misalign, toggle between map and globe to realign.</li>
        </ul>`,
    placement: 'left',
    allowHTML: true // This option is important if you want to render HTML inside the tooltip
  });
  

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
      //} else {
      //  document.getElementById('airport-a-filter-search').disabled = true;
      } else {
          // Code to handle when no country is selected
          document.getElementById('airport-a-filter-search').disabled = false;
          document.getElementById('airport-a-filter-search').value = '';
          setSelectedAirportACode('');
          updateAwesompleteList(awesompleteA, null); // Pass null or undefined to list all airports
          document.getElementById('info-message').textContent = '';
          // Can keep the 'Add' button disabled or enabled - test test
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
      //} else {
      //  document.getElementById('airport-b-filter-search').disabled = true;
      } else {
        // Code to handle when no country is selected
        document.getElementById('airport-b-filter-search').disabled = false;
        document.getElementById('airport-b-filter-search').value = '';
        setSelectedAirportBCode('');
        updateAwesompleteList(awesompleteB , null); // Pass null or undefined to list all airports
        document.getElementById('info-message').textContent = '';
        // Can keep the 'Add' button disabled or enabled - test test
      }
    });
    
    

    countryADropdown.dispatchEvent(new Event('change'));
    countryBDropdown.dispatchEvent(new Event('change'));

  } catch (error) {
    console.error(error);
  }
});

