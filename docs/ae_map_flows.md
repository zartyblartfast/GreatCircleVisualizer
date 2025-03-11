# Azimuthal Equidistant (AE) Map Flow Documentation

## Flow 1: Initial Selection from Dropdown Menu

1. **Entry Point**: User selects "AzimuthalEquidistant" from projection dropdown
   - File: `mapProjection.js`
   - Function: `setupProjectionDropdown`
   - Event: `onChange` of dropdown
   - State Update: `currentProjectionName` set to "geoAzimuthalEquidistant"

2. **Projection Update Flow**:
   ```mermaid
   graph TD
      A[Dropdown Change] --> B[updateProjection]
      B --> C{Is AE Projection?}
      C -->|Yes| D[Create AE Projection]
      D -->|rotate[0,-90,0]| E[Center North Pole]
      E -->|translate| F[Center in Viewport]
      F -->|scale| G[Fit to Circle]
      G --> H[Set Chart Properties]
      H --> I[Reset View]
      H --> J[Configure Interactions]
      C -->|No| K[Handle Other Projections]
      
      %% State Management
      H --> L[Update currentProjection]
      J --> M[Enable/Disable Controls]
   ```

3. **Technical Details**:
   - **Projection Creation**:
     ```javascript
     newProjection = projectionFunction()
         .rotate([0, -90, 0])     // Center on North Pole
         .translate([w/2, h/2])   // Center in viewport
         .scale(h/2)              // Fit to circular boundary
     ```
   - **View Management**:
     - Viewport centering uses chart dimensions
     - Scale factor ensures map fits within bounds
     - Rotation matrix positions North Pole at center

## Flow 2: Globe/Map Toggle with AE Projection

1. **Entry Point**: User clicks toggle button when AE is current projection
   - File: `mapUtilities.js`
   - Function: `createSlider`
   - Event: `switchButton.on("active")`
   - State Check: Verifies `currentProjectionName === "geoAzimuthalEquidistant"`

2. **Toggle Flow**:
   ```mermaid
   graph TD
      A[Toggle Button] --> B{Is Map View?}
      B -->|Yes| C[Setup AE Map]
      B -->|No| D[Setup Globe]
      
      C --> E[Create Fresh AE Projection]
      E --> F[Apply AE Settings]
      F --> G[Enable Vertical Drag]
      
      D --> H[Create Globe Projection]
      H --> I[Apply Globe Settings]
      I --> J[Enable Rotation]
      
      G --> K[Reset View]
      J --> K
      
      %% Interaction Management
      G --> L[Update Drag Handlers]
      J --> M[Update Rotation Handlers]
      K --> N[Disable Animations]
   ```

3. **Interaction Details**:
   - **Map View (AE)**:
     ```javascript
     chart.set("panX", "rotateX")
     chart.set("panY", "rotateY")
     chart.set("rotationY", 1)
     ```
   - **Globe View**:
     ```javascript
     chart.set("panX", "none")
     chart.set("panY", "rotateY")
     chart.set("wheelY", "rotateY")
     ```

## Dependencies and Initialization

1. **Required Libraries**:
   - AmCharts 5 Map: Primary visualization engine
   - D3.js: Handles projection mathematics
   - Key D3 Modules:
     - d3-geo: Core projection support
     - d3-geo-projection: Extended projection types

2. **Key Files and Responsibilities**:
   - `mapProjection.js`: 
     - Projection management
     - D3 integration
     - View calculations
   - `mapUtilities.js`: 
     - UI control logic
     - Event handling
     - State management
   - `map_animations_along_lines.js`: 
     - Initial setup
     - Chart creation
     - Series management

3. **State Management**:
   - `currentProjectionName`: Active projection identifier
   - `chart`: AmCharts map instance
   - `projectionFunction`: Current D3 projection function
   - Local state:
     - Interaction settings
     - View parameters
     - UI element states

## Common Issues and Solutions

| Issue | Description | Solution | Technical Details |
|-------|-------------|----------|-------------------|
| View Reset Timing | Map view may not reset properly when switching between views | Added 50ms delay before calling `chart.goHome()` | Ensures chart initialization completes before view reset |
| Projection Center | AE projection may not center correctly | Dynamic translation and scale calculation | Uses chart dimensions to compute optimal center and scale |
| Interaction Settings | Dragging behavior inconsistent across projections | Projection-specific interaction settings | Separate handlers for map and globe views |
| Toggle Interference | State bleeding between views | Isolated state management | Fresh projection creation on each toggle |
| Scale Issues | Map may appear too large/small | Dynamic scale calculation | Scale = chart.height() / 2 for optimal fit |

## Future Enhancements

1. **Performance Optimizations**:
   - Replace `setTimeout` with proper initialization events
   - Implement smooth transitions between projections
   - Cache projection calculations

2. **Interaction Improvements**:
   - Add touch gesture support
   - Implement smoother drag behavior
   - Add zoom constraints

3. **Visual Enhancements**:
   - Add projection transition animations
   - Improve graticule visibility
   - Add projection boundary indicators

4. **Code Structure**:
   - Implement proper state management
   - Add projection factory pattern
   - Improve event handling architecture

## To Generate Dependency Graph

Run the following commands:
```bash
# Using madge
madge --image docs/ae_dependencies.svg js/mapProjection.js js/mapUtilities.js js/map_animations_along_lines.js

# Using dependency-cruiser
depcruise --include-only "^src" --output-type dot js/mapProjection.js | dot -T svg > docs/ae_dependencies.svg
