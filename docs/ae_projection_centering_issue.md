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

## Proposed Fixes

Based on code analysis, here are the specific fixes for each issue:

### Fix 1: Vertical Scrolling/Panning Problem in Both Sections

**Problem**: The AE map can be vertically scrolled/panned, causing internal distortion.

**Solution**:
1. Modify `restoreAEProjection` function in `mapProjection.js` (line 284):
   - Change `chart.set("panY", "rotateY");` to `chart.set("panY", "none");`
   - This prevents vertical panning/distortion while still allowing horizontal rotation

### Fix 2: Initial Positioning Issue in Section 1

**Problem**: The AE map is not positioned correctly when first opened because `rotationY` is being set via animation, causing a delay in proper centering.

**Solution**:
1. Modify `updateProjection` function in `mapProjection.js` (line 375):
   - Change `restoreAEProjection(chart, true, true);` to `restoreAEProjection(chart, false, true);`
   - This ensures the North Pole is centered immediately without animation delay

### Fix 3: Projection Transition Issue in Section 1

**Problem**: After viewing AE projection, other map projections are out of position because certain properties (particularly `maxPanOut`) are not being properly reset.

**Solution**:
1. Ensure `maxPanOut` is explicitly set in `updateProjection` for non-AE projections:
   - Add `chart.set("maxPanOut", 1);` after line 390 in `updateProjection` function
   - This ensures the property is consistently reset when switching from AE to other projections

2. Enhance the `resetChartPropertiesForProjection` function to be more thorough:
   - Ensure it's called before setting any new projection properties
   - Make sure it explicitly resets all properties that might be affected by the AE projection

### Implementation Plan

1. Make the changes to `restoreAEProjection` first to fix the vertical panning issue in both sections
2. Update `updateProjection` to disable animation for immediate centering
3. Enhance property reset logic to ensure clean transitions between projections
4. Test each change individually to verify it resolves the specific issue

## Next Steps

A comprehensive solution should:
1. Ensure proper initialization of the AE projection with correct positioning
2. Prevent vertical scrolling/panning that causes distortion
3. Properly reset all properties when transitioning from AE to other projections
4. Maintain consistent behavior across both sections of the application