# Transition Concurrency Hardening Plan

## Goal

Make main-map projection, Map/Globe, and Update Flight Paths transitions safe under rapid or programmatic overlap while preserving the existing fresh-root rendering lifecycle and projection interaction configuration.

The intended policy is **latest-request-wins**, not a strict queue. Obsolete intermediate states should not be rendered unnecessarily.

## Current context

- Main-map transitions are owned by `js/map_animations_along_lines.js`.
- Projection selection is bound by `js/mapProjection.js`.
- Projection-specific interaction and centering policy is defined in `data/projections.json` and applied by `js/projectionConfig.js`.
- `recreateMainChart()` already disposes and recreates the amCharts root for projection, globe, and Update Flight Paths transitions.
- The current transition functions are asynchronous but do not serialize overlapping requests or reject stale work.
- `root`, `chart`, `currentProjectionName`, and route restoration state are shared mutable state.
- Existing lifecycle tests cover normal transitions but not rapid overlapping requests.

## Scope constraints

- Do not change projection interaction policy, zoom defaults, centering values, or route rendering behavior as part of this hardening.
- Do not redesign the root-recreation architecture.
- Do not render obsolete intermediate projection or globe states.
- Keep the existing page-level dropdown binding model.

## Proposed approach

Create one transition controller in `js/map_animations_along_lines.js` with a monotonically increasing transition ID.

Every request captures an immutable target state and its ID. After every asynchronous boundary, the transition checks whether its ID is still current. A stale transition must stop and dispose any root/chart resources it created. Only the current transition may publish shared `root`/`chart` references, restore route state, update control state, or start chart animations.

Disable the projection selector, globe toggle, and Update Flight Paths button while a transition is active. Re-enable them only from the current transition's completion path.

## Implementation steps

1. **Define transition state and request contract**
   - Add a module-level transition counter and active transition state.
   - Represent each request with an immutable target projection and globe/map mode.
   - Avoid reading `currentProjectionName` or control state after an `await`; capture the request target at entry.

2. **Centralize transition entry points**
   - Route projection dropdown changes through the controller.
   - Route Globe toggle changes through the controller.
   - Route Update Flight Paths through the controller.
   - Preserve the existing projection dropdown's single replaceable `onchange` handler.

3. **Make resource ownership transition-local**
   - Refactor the rebuild path so a transition uses local root/chart references while constructing.
   - Do not let stale work operate on the global `root` or `chart` belonging to a newer transition.
   - Publish the local root/chart to shared state only after the transition is confirmed current.

4. **Guard every asynchronous boundary**
   - Check the transition ID after configuration readiness, chart creation, map initialization, route recreation, corridor restoration, and any delayed centering/animation callback.
   - If stale, dispose the transition-owned root/chart and return without restoring state or enabling controls.

5. **Lock and restore controls centrally**
   - Disable `#projectionSelect`, `#globe-toggle`, and `#make-maps-button` when a transition begins.
   - Keep them disabled while the current transition is pending.
   - Re-enable them only if the completing transition is still current.
   - Restore the correct Map/Globe label and projection-selector disabled state from the final target mode.

6. **Protect route and visual state restoration**
   - Capture the expanded pair for the transition that owns the rebuild.
   - Replay `pairExpandCollapse` only for the current transition.
   - Ensure stale transitions cannot restore obsolete highlights or corridor overlays.

7. **Add rapid-interaction regression coverage**
   - Add Playwright tests to `tests/main-map-startup.spec.mjs` or a dedicated lifecycle spec.
   - Trigger rapid projection A → projection B requests.
   - Trigger projection → Globe → Update Flight Paths sequences without waiting between requests.
   - Assert the final requested projection/mode wins.
   - Assert exactly one live `chartdiv1` root and one active chart remain.
   - Assert creation/disposal counts are consistent.
   - Assert stale transitions do not restore obsolete route highlights or corridors.
   - Assert all controls are enabled after the final transition.
   - Assert no console errors or unhandled promise rejections.
   - Assert final chart centering is finite and correct on both axes.

8. **Preserve and extend existing verification**
   - Keep the existing root-replacement assertion for Update Flight Paths.
   - Run the complete UI suite with `npm run test:ui -- --reporter=line`.
   - Use composited screenshots or all canvas layers for visual assertions; do not inspect only one amCharts canvas.
   - Verify ordinary spaced interactions still behave exactly as before.
   - Verify the fresh-origin local test path when comparing local and deployed behavior, because imported module/data caches can otherwise make source comparisons misleading.

## Likely files to change

- `js/map_animations_along_lines.js` — primary and preferably only application-code change: transition controller, request routing, local resource ownership, control locking.
- `js/mapProjection.js` — change only if the existing dropdown callback cannot be routed through the controller without it; preserve projection policy and avoid changing projection settings.
- `js/projectionConfig.js` — change only if its delayed `goHome()` callbacks cannot be safely scoped or cancelled from the transition controller; do not alter projection values.
- `tests/main-map-startup.spec.mjs` — rapid update and lifecycle assertions.
- Possibly a new `tests/transition-concurrency.spec.mjs` — only if keeping concurrency scenarios separate improves clarity.

No changes are planned for `data/projections.json`, `index.html`, CSS, route rendering, or the existing lifecycle documentation unless implementation details make them inaccurate. Delayed centering callbacks must be explicitly considered before declaring stale-transition cleanup complete.

## Risks and mitigations

- **Stale transition disposes the current root:** keep root/chart references local and publish only after the ID check.
- **Older completion re-enables controls:** require the completing ID to equal the current ID before changing controls.
- **Projection selection state drifts:** capture target projection in the request and update the select value only for the winning request.
- **Existing route state is lost:** capture and restore expanded-pair state only for the winning transition.
- **Tests become timing-sensitive:** use diagnostics and polling for rendered state rather than fixed sleeps wherever possible.
- **A new transition starts while controls are disabled:** preserve the ID guard for programmatic or already queued events; control locking is not the sole correctness mechanism.

## Acceptance criteria

The hardening is complete only when rapid overlapping requests deterministically leave the application in the state of the latest request, with one live root/chart, correct route state and centering, re-enabled controls, and no console or promise errors. Existing projection, globe, route, resize, and Update Flight Paths behavior must remain intact.
