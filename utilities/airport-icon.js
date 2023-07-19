// Wait for the DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
    const airportIcons = document.querySelectorAll('.airport-icon');
    
    // Iterate over each airport icon
    airportIcons.forEach(icon => {
      const svgSrc = icon.getAttribute('data-src');
      
      // Fetch the SVG file
      fetch(svgSrc)
        .then(response => response.text())
        .then(svgText => {
          const parser = new DOMParser();
          const svgDocument = parser.parseFromString(svgText, 'image/svg+xml');
          
          // Check if the SVG document is accessible
          if (svgDocument.documentElement) {
            const svgPaths = svgDocument.documentElement.querySelectorAll('path');
            
            // Apply fill colors to SVG paths
            svgPaths.forEach(path => {
              const elementId = path.getAttribute('id');
              path.style.fill = getFillColor(elementId);
            });
            
            // Replace the icon's content with the modified SVG document
            const newSvgElement = svgDocument.documentElement.cloneNode(true);
            icon.parentNode.replaceChild(newSvgElement, icon);
          } else {
            console.error('SVG document not accessible for an airport icon.');
          }
        })
        .catch(error => {
          console.error('Failed to fetch SVG file:', error);
        });
    });
  });
  
  // Define the fill colors based on the element ID
  function getFillColor(elementId) {
    switch (elementId) {
      case 'rect3381':
        return '#000000';
      case 'rect3383':
        return '#c6c6de';
      case 'rect3385':
        return '#efe7ff';
      case 'rect3400':
        return '#efe7ff';
      case 'rect2500':
        return '#000000';
      case 'rect3402':
        return '#efe7ff';
      case 'path3451':
        return '#000000';
      default:
        return '';
    }
  }
  