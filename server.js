const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Create an express app
const app = express();

// Use cors middleware to enable cross-origin requests
app.use(cors());

// Read the airports.json file from the data directory
const airportsPath = path.join(__dirname, 'data', 'airports.json');
const rawData = fs.readFileSync(airportsPath);
const airports = JSON.parse(rawData);  // Parse rawData into JavaScript object

// Set up an API endpoint to get airport data by IATA code
app.get('/api/airports/:iata', (req, res) => {
  const iata = req.params.iata.toUpperCase();
  const airport = airports.find(a => a.iata_code === iata);

  if (airport) {
    res.json(airport);
  } else {
    res.status(404).json({ error: 'Airport not found' });
  }
});

// Set up an API endpoint to get all airport data
app.get('/api/airports', (req, res) => {
  res.json(airports);
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
