# Map Projection and Globe Lifecycle

This document describes the main-map rendering lifecycle. Its purpose is to keep projection centering deterministic when users switch between map projections, Globe view, resize the browser, or update flight paths.

## Problem addressed

amCharts map projections retain private fit, translation, and canvas-layer state. Replacing a projection on an existing chart can carry that state into the next projection. This is especially visible when moving between D3 special projections and the orthographic globe.

The main map therefore treats every projection or mode change as a new rendering lifecycle. It does not mutate a retained map or globe chart into a different projection.

## Authoritative state

The chart is disposable; route data is not.

| State | Owner | Lifecycle behavior |
|---|---|---|
| Selected map projection | `currentProjectionName` in `js/mapProjection.js` | Used to create the next Map chart. |
| Globe/Map mode | `#globe-toggle` | Determines the target chart mode. |
| Airport pairs | `window.globalLocationPair.locationPairs` | Replotted on every new chart. User-created pairs are also stored in browser local storage. |
| Expanded pair | `.tag.expanded` | Captured before a rebuild and replayed afterward. |
| Great Circle highlight | `pairExpandCollapse` listener | Reapplied when the expanded pair event is replayed. |
| Flight-corridor overlay | `corridorRenderer.js` | Re-requested by the replayed expanded-pair event; corridor datasets are cached by the renderer. |

Never treat amCharts series, data items, canvases, or roots as authoritative application state. They are presentation objects and are disposed during a transition.

## Transition controller

`js/map_animations_along_lines.js` owns main-map transitions.

1. Capture the expanded airport-pair ID, if present.
2. Stop chart-owned animations and clear transient references.
3. Dispose the current amCharts root and clear `#chartdiv1`.
4. Create a fresh root and theme.
5. Create the target chart directly:
   - Map mode starts with the selected D3 projection.
   - Globe mode starts as orthographic; it must not first create the previous D3 map projection and then replace it.
6. Recreate country geometry, markers, Great Circle routes, and corridor series from authoritative data.
7. Replay the expanded-pair event to restore highlight and corridor overlay state.
8. Enable the relevant controls only after the target chart exists.

All of these transitions must use this lifecycle:

- Map projection A → map projection B
- Map → Globe
- Globe → Map
- Rebuild after Update Flight Paths

The Globe → Map route must create a fresh Map chart. Calling `applyProjectionConfig()` on an existing orthographic chart reintroduces stale fitting state.

## Dropdown binding rule

`#projectionSelect` belongs to the page, not to an amCharts root. Bind it once with a replaceable `onchange` handler. Do not add a new event listener from chart initialization; old handlers capture disposed charts and cause one user selection to update several stale instances.

## Projection configuration

`data/projections.json` is the source of projection-specific policy. Most projections use the shared defaults. Use an opt-in field only after a composited visual regression demonstrates a real need:

- `rotationX`, `rotationY`: geographic rotation
- `homeGeoPoint`: non-default geographic centre
- `homeZoomLevel`: additional fit margin for an unusually tall/wide projection
- `panX`, `panY`, `wheelY`, `maxPanOut`: interaction policy

Examples currently requiring specific policy include Craig, Chamberlin Africa, Conic Equal Area, and the Two-Point Azimuthal USA projection. Do not copy their values to unrelated projections.

## Verification

Use the Playwright UI suite:

```bash
npm run test:ui -- --reporter=line
```

Key tests:

| Test | Purpose |
|---|---|
| `tests/main-map-startup.spec.mjs` | Startup produces exactly one visible map, including when projection configuration loads slowly. |
| `tests/projection-centering-all.spec.mjs` | Runs each visible projection through the dropdown and checks the composited chart centre. |
| `tests/projection-transition.spec.mjs` | Checks special-to-ordinary transitions and resized viewport behavior. |
| `tests/globe-transition.spec.mjs` | Checks Globe centering after special map projections. |
| `tests/route-state-transition.spec.mjs` | Checks that an expanded flight-corridor route remains visible through Map → Globe → Map. |

amCharts renders multiple stacked canvases. A test must compose all canvases, or capture `#chartdiv1` as a browser-composited screenshot. Inspecting one canvas layer is not valid visual evidence.

Run the corridor tooling tests separately:

```bash
npm test --prefix C:/hermes/greatcircevisualizer/tools/corridors
```
