# JSON Map Configuration Design

## Overview

This document outlines the design and implementation of a JSON-based configuration system for map projections in the Great Circle Visualizer. The goal is to create a centralized, maintainable configuration that addresses projection transition issues and allows for customized settings per projection type.

## Problem Statement

The current implementation faces several challenges:

1. **Inconsistent Projection Transitions**: Transitions between different map projections, particularly from Azimuthal Equidistant (AE) to other projections, can cause distortion and positioning issues.

2. **Property Override Timing**: AMCharts may override our property settings during its internal initialization process.

3. **Multiple State Tracking Mechanisms**: The current code uses multiple ways to track projection state, leading to inconsistencies.

4. **Projection-Specific Requirements**: Different projections have different property requirements that aren't consistently applied.

## Proposed Solution

Implement a JSON-based configuration system that:

1. Centralizes all projection-specific settings
2. Ensures consistent application of settings
3. Allows for customization of each projection type
4. Eliminates timing and state tracking issues

## Configuration Structure

The configuration will be stored in a dedicated JavaScript module (`projectionConfigs.js`) that exports a configuration object:

```javascript
export const projectionConfigs = {
  "geoMercator": {
    rotationX: 0,
    rotationY: 0,
    panX: "translateX",  // Allow horizontal panning
    panY: "none",        // Prevent vertical panning to avoid distortion
    wheelY: "zoom",      // Allow zooming
    maxPanOut: 0.2,      // Limit panning outside boundaries
    allowRotation: false // Mercator shouldn't be rotated
  },
  "geoAzimuthalEquidistant": {
    rotationX: 0,
    rotationY: -90,      // Center on North Pole
    panX: "rotateX",     // Allow rotation
    panY: "rotateY",     // Allow rotation
    wheelY: "rotateY",   // Allow rotation with wheel
    maxPanOut: 0,        // Prevent panning outside the circular boundary
    allowRotation: true  // AE should be rotatable
  },
  "geoOrthographic": {
    rotationX: 0,
    rotationY: 0,
    panX: "rotateX",     // Globe should rotate
    panY: "rotateY",     // Globe should rotate
    wheelY: "rotateY",   // Globe should rotate with wheel
    maxPanOut: 1,        // Standard setting for globe
    allowRotation: true  // Globe should be rotatable
  },
  // Add more projection configurations as needed
  "geoNaturalEarth1": {
    rotationX: 0,
    rotationY: 0,
    panX: "translateX",
    panY: "none",
    wheelY: "zoom",
    maxPanOut: 0.2,
    allowRotation: false
  },
  // Default settings for any projection not explicitly defined
  "default": {
    rotationX: 0,
    rotationY: 0,
    panX: "none",
    panY: "none",
    wheelY: "zoom",
    maxPanOut: 0.2,
    allowRotation: false
  }
};
```

## Implementation Plan

### Phase 1: Create Configuration File

1. Create `js/projectionConfigs.js` with initial configurations for:
   - Mercator
   - Azimuthal Equidistant
   - Orthographic
   - Default settings

2. Include configurations for all currently supported projections

### Phase 2: Update Map Projection Handling

1. Modify `setProjection` method in `mapComparisonDisplay.js` to use the configuration:
   - Import the configuration
   - Look up settings for the current projection
   - Apply all settings from the configuration
   - Force chart redraw with `chart.invalidateLayout()`

2. Simplify state tracking by relying on the configuration

3. Update special case handling for AE projection

### Phase 3: Testing and Refinement

1. Test transitions between all projection types
2. Fine-tune configuration settings based on testing results
3. Add additional projections as needed

## Progress Tracking

- [ ] Create initial configuration file
- [ ] Update `setProjection` method
- [ ] Test basic transitions
- [ ] Refine configuration settings
- [ ] Test all projection combinations
- [ ] Document final solution

## Implementation Notes

### Key Changes Required

1. **New Files**:
   - `js/projectionConfigs.js` - Configuration definitions

2. **Modified Files**:
   - `js/mapComparisonDisplay.js` - Update `setProjection` method
   - `js/mapProjection.js` - Simplify projection handling

3. **Potential Challenges**:
   - Finding optimal settings for each projection type
   - Ensuring AMCharts respects our settings
   - Handling special cases like AE projection centering
