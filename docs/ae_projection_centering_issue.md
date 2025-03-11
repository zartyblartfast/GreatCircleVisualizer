# Azimuthal Equidistant Projection Centering Issue

## Problem Description

After selecting the Azimuthal Equidistant (AE) projection in the Great Circle Visualizer application, other map projections are either not correctly positioned or not visible at all. Toggling to Globe view and back to map view temporarily resolves the issue, but introduces a new problem where the AE projection is not centered with the North Pole when toggled back.

## Affected Files

The main files affected by this issue are:

- `js/mapComparisonDisplay.js` - Contains the map display logic for the first section
- `js/mapProjection.js` - Contains shared projection handling code used by both sections
- `js/map_animations_along_lines.js` - Contains the map display logic for the second section

## Root Cause Analysis

After thorough investigation, the root cause of the projection transition bug has been identified:

1. **Special Handling for AE Projection**: The AE projection requires special handling with specific chart properties:
   - `rotationY: -90` (to center on the North Pole)
   - `panX: "rotateX"`, `panY: "rotateY"`, `wheelY: "rotateY"` (for proper interaction)
   - `maxPanOut: 0` (in the first section's implementation)

2. **Incomplete Property Reset**: When switching from AE to other projections, these properties are not being properly reset, causing subsequent projections to be improperly displayed.

3. **Duplicate Implementations**: There are two separate implementations for handling the AE projection:
   - In `mapProjection.js` (updateProjection function)
   - In `mapComparisonDisplay.js` (centerAEProjection method)
   
   These implementations set different properties and use different approaches, causing conflicts.

4. **Unreliable Transition Detection**: The current approach of using `this.previousProjection` to detect transitions from AE is unreliable because `this.currentProjection` and `this.previousProjection` are updated in `handleProjectionSelection()` before `setProjection()` is called.

5. **Inconsistent Property Setting**: The `maxPanOut` property is set to 0 in the `centerAEProjection` method but not in the `updateProjection` function, leading to inconsistent behavior.

6. **North Pole Centering Lost After Toggle**: When toggling between globe and map views, the AE projection loses its proper centering on the North Pole (rotationY: -90 is not maintained).

## Observed Behavior

1. **First Section (with Toggle Button)**:
   - After viewing AE projection, other projections are not centered correctly
   - Toggling to Globe view temporarily fixes the issue
   - When toggling back from Globe to AE, the AE projection is not centered correctly (North Pole is no longer at center)

2. **Second Section (without Toggle Button)**:
   - Experiences the same issues when switching from AE to other projections
   - No workaround available since there's no toggle button

## Key Insights

1. The issue affects both sections of the application despite having different UI elements, confirming that the core issue is in the shared code that handles projection transitions.

2. Toggling to the globe view in the first section "fixes" the issue temporarily because it forces a complete reset of all chart properties.

3. The logs reveal that when switching from AE to Mercator projection, the `this.currentProjection` is already set to "geoMercator" when the `setProjection` method is called, causing the `switchingFromAE` condition to fail.

4. The `maxPanOut` property is set to 0 for the AE projection but is never reset when switching to other projections.

5. The AE projection requires rotationY: -90 to keep the North Pole centered, but this setting is lost during toggle operations.

## Current Status

Despite previous attempts to fix the issue, the problem persists in both sections of the application. The temporary workaround of toggling to Globe view and back is not a sustainable solution, especially since the second section doesn't have this option.

## Critical Requirements

1. **Fix Projection Transitions**: Ensure all map projections display correctly after switching from the AE projection.

2. **Maintain North Pole Centering**: The AE projection must always show the North Pole at the center of the map, even after toggling between views.

3. **Preserve Existing Functionality**: All current functionality must continue to work correctly, particularly:
   - Display of locations (cities, airports) on all map projections
   - Annotations and labels must remain visible and correctly positioned
   - Great Circle and Rhumb Line routes must be drawn correctly on all projections
   - Interactive elements (tooltips, hover effects) must continue to function

## Step-by-Step Solution Plan

To solve this issue in a systematic and testable way, we'll follow this incremental approach:

### Phase 1: Consolidate AE Projection Handling

1. **Step 1.1: Create a unified AE projection handler in mapProjection.js**
   - Create a new function `initializeAEProjection(chart)` in mapProjection.js
   - Move all AE-specific logic from both implementations into this function
   - Ensure it sets all necessary properties consistently (rotationY: -90, panX: "rotateX", panY: "rotateY", wheelY: "rotateY", maxPanOut: 0)
   - Add comprehensive logging for debugging
   - Ensure the North Pole is always centered by explicitly setting rotationY to -90

2. **Step 1.2: Update the updateProjection function**
   - Modify the updateProjection function to call the new initializeAEProjection function
   - Remove the duplicate AE-specific code
   - Ensure it properly handles the return value and projection object
   - Verify that all map elements (locations, routes) still display correctly

3. **Step 1.3: Update the centerAEProjection method**
   - Modify centerAEProjection to call the new initializeAEProjection function
   - Remove the duplicate implementation
   - Maintain any MapComparisonDisplay-specific logic if needed
   - Test that all map elements render correctly after this change

### Phase 2: Implement Reliable Projection Transition Handling

4. **Step 2.1: Create a projection state tracker**
   - Add a function in mapProjection.js to track the current projection state
   - Store the current projection type and all its associated properties
   - Provide methods to query if the current projection is AE
   - Ensure this doesn't interfere with existing map element rendering

5. **Step 2.2: Implement a comprehensive reset function**
   - Create a resetProjectionProperties(chart) function in mapProjection.js
   - Ensure it resets ALL properties that might be set by any projection
   - Include explicit resets for rotationX, rotationY, panX, panY, wheelY, maxPanOut
   - Verify that resetting these properties doesn't affect the display of map elements

6. **Step 2.3: Update setProjection to use the new functions**
   - Modify setProjection to call resetProjectionProperties before setting a new projection
   - Remove the existing detection logic that uses currentProjection/previousProjection
   - Use the projection state tracker to determine the current state
   - Test thoroughly to ensure map elements are still displayed correctly

### Phase 3: Fix Toggle Functionality and North Pole Centering

7. **Step 3.1: Enhance toggleMapGlobe method**
   - Update the toggleMapGlobe method to properly handle the AE projection
   - Store the fact that we're toggling from AE projection when switching to globe view
   - When toggling back to AE from globe view, ensure the North Pole is properly centered
   - Add a flag to track when a toggle operation is in progress
   - Verify that locations and routes are preserved during toggle operations

8. **Step 3.2: Implement projection-specific restore logic**
   - Create a restoreAEProjection function that ensures the North Pole is centered
   - Call this function whenever returning to AE projection, especially after toggle operations
   - Ensure rotationY is always set to -90 for AE projection
   - Add verification checks to confirm the North Pole is centered
   - Test that all map elements are correctly positioned after restoration

### Phase 4: Fix the Second Section

9. **Step 4.1: Update map_animations_along_lines.js**
   - Ensure it uses the new unified projection handling functions
   - Add proper reset logic when changing projections
   - Implement consistent property handling
   - Verify that all routes and animations still work correctly

10. **Step 4.2: Standardize chart initialization**
    - Ensure both sections initialize charts with consistent default properties
    - Standardize how projections are applied to charts
    - Test that map elements are displayed correctly in both sections

### Phase 5: Preserve Map Elements Functionality

11. **Step 5.1: Implement safeguards for map elements**
    - Add code to ensure map series (pointSeries, lineSeries) are preserved during projection changes
    - Verify that all elements remain visible and correctly positioned
    - Add specific handling for AE projection to ensure elements are properly displayed
    - Test with various data points to ensure all map elements render correctly

12. **Step 5.2: Enhance route drawing logic**
    - Review and update the code that draws routes on the maps
    - Ensure routes are correctly displayed on all projections, especially after switching from AE
    - Add specific checks for route visibility after projection changes
    - Test with various route combinations to ensure correct rendering

13. **Step 5.3: Validate existing functionality**
    - Test that all interactive features (tooltips, clicks, hovers) still work correctly
    - Verify that annotations and labels are correctly positioned
    - Test with various data sets to ensure consistent behavior
    - Confirm that all existing functionality works as expected

### Phase 6: Testing and Validation

14. **Step 6.1: Test AE projection initialization**
    - Verify that the AE projection centers correctly on first selection
    - Check that the North Pole is properly centered
    - Validate that all properties are set correctly
    - Confirm that all map elements (locations, routes, annotations) display correctly

15. **Step 6.2: Test transitions from AE to other projections**
    - Test transitioning from AE to each other projection
    - Verify that all projections display correctly after viewing AE
    - Confirm that no properties from AE persist inappropriately
    - Verify that all map elements remain visible and correctly positioned

16. **Step 6.3: Test transitions to AE from other projections**
    - Test selecting AE after viewing each other projection
    - Verify that AE centers correctly in all cases
    - Confirm that the North Pole is properly centered
    - Check that all map elements are correctly displayed

17. **Step 6.4: Test the toggle functionality**
    - Verify that toggling between globe and map views works correctly
    - Test that AE centers correctly after toggling with North Pole at center
    - Confirm that other projections display correctly after toggling
    - Specifically test the rotationY value after toggle operations
    - Verify that all map elements are preserved during toggle operations

18. **Step 6.5: Comprehensive functionality testing**
    - Test all interactive features (tooltips, clicks, hovers)
    - Verify that annotations and labels are correctly positioned
    - Test with various data sets to ensure consistent behavior
    - Confirm that all existing functionality works as expected

Each step should be implemented and tested individually before moving to the next one. This incremental approach will help identify any regressions or new issues early in the process.