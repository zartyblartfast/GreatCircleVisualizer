 # Azimuthal Equidistant Projection Issues

## Current Problems

### Section 1 (Main Section with Toggle Button)

1. **Vertical Scrolling/Panning Problem**: The AE map can be vertically scrolled/panned, meaning that if a user clicks on the map and drags, the map doesn't move position but it distorts internally. This behavior should not occur.

2. **Initial Positioning Issue**: When the AE map first opens, it's not positioned correctly and the bottom of the map is cut off.

3. **Projection Transition Issue**: After selecting the AE map, all other map projections selected afterward are out of position in the viewing area.

### Section 2 (Comparison Section without Toggle Button)

1. **Vertical Scrolling/Panning Problem**: The AE map exhibits the same issue as in Section 1, where it can be vertically scrolled/panned, causing internal distortion rather than proper movement.

## Technical Analysis

The Azimuthal Equidistant projection requires specific chart properties to display correctly:
- `rotationY: -90` (to center on the North Pole)
- `panX: "rotateX"`, `panY: "rotateY"`, `wheelY: "rotateY"` (for proper interaction)
- `maxPanOut: 0` (to prevent distortion)

These properties need to be consistently applied when initializing the AE projection and properly reset when switching to other projections.

The D3.js projection object's properties (scale, translate, rotate) significantly affect the positioning and appearance of the map. When transitioning between projections, these properties must be properly reset to ensure correct display.

## Root Cause Analysis (Updated 2025-03-12)

After a deep analysis of the code and logs, we've identified the fundamental issue causing the projection transition problems:

### 1. Incorrect Transition Detection Logic

In `mapComparisonDisplay.js`, the `setProjection` method uses the following logic to detect transitions from AE:

```javascript
const switchingFromAE = this.previousProjection === 'geoAzimuthalEquidistant' && name !== 'geoAzimuthalEquidistant';
```

This logic is flawed because of the sequence of operations:

1. In `handleProjectionSelection()`, the code updates `this.currentProjection` to the new projection BEFORE calling `updateMapProjections()`
2. Then in `updateMapProjections()`, it calls `setProjection()` with the already updated values
3. By the time `setProjection()` runs, `this.previousProjection` hasn't been updated yet, and it's not reliable for detecting the transition

### 2. Conflicting State Management Systems

There are two separate state tracking mechanisms:

1. **Class-level tracking** in `MapComparisonDisplay` using `this.currentProjection` and `this.previousProjection`
2. **Module-level tracking** in `mapProjection.js` using the `projectionState` object

These two systems are not properly synchronized, leading to inconsistent state detection.

### 3. Property Reset Timing Issues

The property reset logic in `resetChartPropertiesForProjection` relies on the global `projectionState` to determine if we're transitioning from AE:

```javascript
const wasAE = currentState.isAzimuthalEquidistant;
```

But this state might not be in sync with the actual projection change happening in the UI.

## Proposed Fixes

Based on the latest analysis, here are the specific fixes for each issue:

### Fix 1: Vertical Scrolling/Panning Problem in Both Sections

**Problem**: The AE map can be vertically scrolled/panned, causing internal distortion.

**Solution**:
1. Modify `restoreAEProjection` function in `mapProjection.js` (lines 283-285):
   ```javascript
   // Change from:
   chart.set("panX", "rotateX");
   chart.set("panY", "rotateY");
   chart.set("wheelY", "rotateY");
   
   // To:
   chart.set("panX", "none");
   chart.set("panY", "none");
   chart.set("wheelY", "none");
   ```
   - This completely disables panning and wheel interactions, matching the behavior in the test_d3_latest.html file
   - The test file shows that disabling all interactions prevents the distortion problem while still displaying the map correctly

### Fix 2: Initial Positioning Issue in Section 1

**Problem**: The AE map is not positioned correctly when first opened because `rotationY` is being set via animation, causing a delay in proper centering.

**Solution**:
1. Modify `updateProjection` function in `mapProjection.js` (line 375):
   - Change `restoreAEProjection(chart, true, true);` to `restoreAEProjection(chart, false, true);`
   - This ensures the North Pole is centered immediately without animation delay

### Fix 3: Projection Transition Issue in Section 1

**Problem**: After viewing AE projection, other map projections are out of position because the transition detection logic is flawed, causing critical property resets to be skipped.

**Solution**:

1. **Pass the old projection explicitly**: Update `updateMapProjections()` to pass the old projection to `setProjection()`:

   ```javascript
   // In updateMapProjections() method
   this.setProjection(this.projectionMap, this.currentProjection, oldProjection);
   ```

2. **Update the function signature**: Modify `setProjection()` to accept the old projection as a parameter:

   ```javascript
   setProjection(chart, name, oldProjection) {
       // Use oldProjection for transition detection
       const switchingFromAE = oldProjection === 'geoAzimuthalEquidistant' && name !== 'geoAzimuthalEquidistant';
       
       // Log transition detection
       Logger.debug('mapComparisonDisplay', "Transition detection:", {
           oldProjection,
           newProjection: name,
           switchingFromAE
       });
       
       // Rest of the method...
   }
   ```

3. **Update createMap method**: When initializing a map, pass the same projection as both new and old:

   ```javascript
   // In createMap method
   this.setProjection(localChart, projectionType, projectionType);
   ```

### Implementation Plan

1. Update the `setProjection` method in `mapComparisonDisplay.js` to accept and use the `oldProjection` parameter
2. Modify `updateMapProjections` to pass the old projection to `setProjection`
3. Update `createMap` to pass the same projection as both new and old when initializing
4. Test the changes to verify they resolve the transition issues

## Code Changes

Here are the specific code changes needed:

### 1. Update `setProjection` in `mapComparisonDisplay.js`:

```javascript
setProjection(chart, name, oldProjection) {
    Logger.debug('mapComparisonDisplay', "setProjection called with name:", name);
    
    // Check if d3 is available
    if (!d3) {
        Logger.error('mapComparisonDisplay', "d3 is not available");
        return;
    }
    
    // Log chart properties before any changes
    Logger.debug('mapComparisonDisplay', "BEFORE setProjection - Chart properties:", {
        rotationX: chart.get("rotationX"),
        rotationY: chart.get("rotationY"),
        panX: chart.get("panX"),
        panY: chart.get("panY"),
        wheelY: chart.get("wheelY"),
        maxPanOut: chart.get("maxPanOut")
    });
    
    // Use oldProjection parameter for transition detection
    const switchingFromAE = oldProjection === 'geoAzimuthalEquidistant' && name !== 'geoAzimuthalEquidistant';
    
    // Log transition detection
    Logger.debug('mapComparisonDisplay', "Transition detection:", {
        oldProjection,
        currentProjection: this.currentProjection,
        newProjection: name,
        switchingFromAE
    });
    
    // Reset chart properties for the target projection
    resetChartPropertiesForProjection(chart, name);

    if (name === "geoAzimuthalEquidistant") {
        // For AE projection, use the restoreAEProjection function instead of centerAEProjection
        Logger.debug('mapComparisonDisplay', "Calling restoreAEProjection from setProjection");
        // Use restoreAEProjection with no animation for immediate effect
        const success = restoreAEProjection(chart, false, true);
        Logger.debug('mapComparisonDisplay', "restoreAEProjection result:", success);
    } else {
        // For non-AE projections, call updateProjection from mapProjection.js
        const isOrthographic = name === "geoOrthographic";
        Logger.debug('mapComparisonDisplay', "Calling updateProjectionFromMapProjection with:", {
            chart: "chart object",
            name,
            isOrthographic
        });
        
        const projection = updateProjectionFromMapProjection(chart, name, isOrthographic);
        Logger.debug('mapComparisonDisplay', "Projection returned:", projection ? "defined" : "undefined");
        
        // Explicitly ensure maxPanOut is set to 1 for non-AE projections
        // This addresses the root cause of the projection transition issues
        if (name !== "geoAzimuthalEquidistant") {
            Logger.debug('mapComparisonDisplay', "Explicitly setting maxPanOut to 1 for non-AE projection");
            chart.set("maxPanOut", 1);
        }
    }
    
    // If we're switching from AE to another projection, ensure all properties are properly reset
    if (switchingFromAE) {
        Logger.debug('mapComparisonDisplay', "FINAL CHECK: Detected transition FROM AE projection - forcing complete property reset");
        // Force a complete reset of all properties as the final step
        chart.set("rotationX", 0);
        chart.set("rotationY", 0);
        chart.set("panX", name === "geoOrthographic" ? "rotateX" : "none");
        chart.set("panY", name === "geoOrthographic" ? "rotateY" : "none");
        chart.set("wheelY", name === "geoOrthographic" ? "rotateY" : "none");
        chart.set("maxPanOut", 1);
    }
    
    // Update projection tracking
    this.previousProjection = this.currentProjection;
    this.currentProjection = name;
    
    // Log chart properties after changes
    Logger.debug('mapComparisonDisplay', "AFTER setProjection - Chart properties:", {
        rotationX: chart.get("rotationX"),
        rotationY: chart.get("rotationY"),
        panX: chart.get("panX"),
        panY: chart.get("panY"),
        wheelY: chart.get("wheelY"),
        maxPanOut: chart.get("maxPanOut"),
        currentProjection: this.currentProjection,
        previousProjection: this.previousProjection
    });
}
```

### 2. Update `updateMapProjections` in `mapComparisonDisplay.js`:

```javascript
updateMapProjections(oldProjection) {
  Logger.debug('mapComparisonDisplay', "[MAP_DEBUG] updateMapProjections called. Current projection:", this.currentProjection);
  if (this.projectionMap) {
    // Determine if we're switching from AE projection using the passed oldProjection
    const wasAzimuthalEquidistant = oldProjection === 'geoAzimuthalEquidistant';
    
    // Log the transition detection and toggle state
    Logger.debug('mapComparisonDisplay', "Transition detection:", {
      oldProjection: oldProjection,
      wasAzimuthalEquidistant: wasAzimuthalEquidistant,
      isTogglingMapGlobe: this.isTogglingMapGlobe || false
    });
    
    this.setProjection(this.projectionMap, this.currentProjection, oldProjection);
    // Rest of the method...
  }
}
```

### 3. Update `createMap` in `mapComparisonDisplay.js`:

```javascript
// In createMap method, update the setProjection call:
this.setProjection(localChart, projectionType, projectionType);
```

## Next Steps

After implementing these changes:

1. Test transitions from AE to other projections to verify that the positioning issues are resolved
2. Monitor the logs to confirm that the transition detection is working correctly
3. Verify that the `maxPanOut` property is being properly reset when switching from AE
4. Consider further refactoring to consolidate the state management between the class-level and module-level tracking systems