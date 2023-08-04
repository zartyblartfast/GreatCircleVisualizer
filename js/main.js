//export let locationPairs = JSON.parse(localStorage.getItem('locationPairs')) || [];
/*
import Headroom from "headroom.js";

var header = document.querySelector('.headroom');
var headroom = new Headroom(header);
headroom.init();
// grab an element
//var myElement = document.querySelector("header");
// construct an instance of Headroom, passing the element
//var headroom  = new Headroom(myElement);
*/

//var Headroom = require('./node_modules/headroom.js/dist/headroom.min.js'); // Adjust the path as needed
var myElement = document.querySelector("header");
var headroom  = new Headroom(myElement);
headroom.init();


 
//console.log(headroom);

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