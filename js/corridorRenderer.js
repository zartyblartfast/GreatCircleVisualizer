// ---------------------------------------------------------------------------
// corridorRenderer.js
//
// Loads corridor dataset JSON files on demand, caches them, and renders
// median polylines on the main map for A→B and B→A directions.
//
// Designed for minimal coupling: the only integration point is
// map_animations_along_lines.js calling init(), show(), and hide().
// ---------------------------------------------------------------------------

/** @type {Map<string, object|null>} Cache: directionKey → dataset or null (not available) */
const cache = new Map();

/** @type {am5map.MapLineSeries|null} */
let atobSeries = null;

/** @type {am5map.MapLineSeries|null} */
let btoaSeries = null;

/** @type {am5.Root|null} */
let _root = null;

/** @type {am5map.MapChart|null} */
let _chart = null;

// Colors for the two directions
const ATOB_COLOR = 0x2563EB; // blue
const BTOA_COLOR = 0x0D9488; // teal

/**
 * Initialise (or re-initialise) the corridor line series on the chart.
 * Call this inside initializeMap() after other series are created.
 *
 * @param {am5.Root} root
 * @param {am5map.MapChart} chart
 */
export function initCorridorSeries(root, chart) {
    _root = root;
    _chart = chart;

    // A→B direction series
    atobSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
    atobSeries.mapLines.template.setAll({
        stroke: am5.color(ATOB_COLOR),
        strokeWidth: 6,
        strokeOpacity: 0.7,
        strokeDasharray: [16, 6],
        interactive: true,
        cursorOverStyle: "pointer"
    });
    atobSeries.mapLines.template.set("tooltip", am5.Tooltip.new(root, {}));

    // B→A direction series
    btoaSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
    btoaSeries.mapLines.template.setAll({
        stroke: am5.color(BTOA_COLOR),
        strokeWidth: 6,
        strokeOpacity: 0.7,
        strokeDasharray: [16, 6],
        interactive: true,
        cursorOverStyle: "pointer"
    });
    btoaSeries.mapLines.template.set("tooltip", am5.Tooltip.new(root, {}));
}

/**
 * Show corridor median lines for a given pair.
 * Fetches datasets on demand and caches results.
 *
 * @param {string} pairId  e.g. "LAX-DXB"
 */
export async function showCorridor(pairId) {
    hideCorridor();

    if (!atobSeries || !btoaSeries) return;

    const parts = pairId.split("-");
    if (parts.length < 2) return;

    // Support 4-char ICAO codes: split on first hyphen
    const hyphenIdx = pairId.indexOf("-");
    const originCode = pairId.substring(0, hyphenIdx);
    const destCode = pairId.substring(hyphenIdx + 1);

    // Fetch both directions in parallel
    const [atobData, btoaData] = await Promise.all([
        fetchDataset(originCode, destCode),
        fetchDataset(destCode, originCode)
    ]);

    if (atobData) {
        drawMedianLine(atobSeries, atobData, originCode, destCode);
    }
    if (btoaData) {
        drawMedianLine(btoaSeries, btoaData, destCode, originCode);
    }
}

/**
 * Hide (clear) all corridor lines from the map.
 */
export function hideCorridor() {
    clearSeries(atobSeries);
    clearSeries(btoaSeries);
}

/**
 * Safely remove all data items from a MapLineSeries.
 * Items added via pushDataItem() live in dataItems, not data,
 * so data.setAll([]) alone won't clear them.
 */
function clearSeries(series) {
    if (!series) return;
    // Snapshot the items to avoid mutating the array during iteration
    const items = [...series.dataItems];
    for (const item of items) {
        series.disposeDataItem(item);
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a corridor dataset JSON. Returns cached result or null if not available.
 */
async function fetchDataset(origin, dest) {
    const key = `${origin}-${dest}`;

    if (cache.has(key)) {
        return cache.get(key);
    }

    try {
        const url = `./data/corridors/${key}-v1.json`;
        const response = await fetch(url);

        if (!response.ok) {
            cache.set(key, null);
            return null;
        }

        const data = await response.json();
        cache.set(key, data);
        return data;
    } catch {
        cache.set(key, null);
        return null;
    }
}

/**
 * Draw a median polyline on a MapLineSeries using explicit LineString geometry.
 * Each consecutive pair of points is rendered as its own 2-point segment,
 * mirroring the rhumb line renderer approach. Antimeridian crossings are
 * handled by inserting boundary points at ±180° inline.
 */
function drawMedianLine(series, dataset, origin, dest) {
    if (!dataset || !dataset.median || dataset.median.length < 2) return;

    const tooltipText =
        `[bold]Typical Route: ${origin}→${dest}[/]` +
        `\nBased on ${dataset.nFlights} flights` +
        (dataset.dateFrom && dataset.dateTo
            ? `\nPeriod: ${dataset.dateFrom} to ${dataset.dateTo}`
            : "") +
        `\n${dataset.kPoints} track points`;

    // Build a point list with antimeridian crossings handled inline
    // (same pattern as calculateRhumbLinePoints in mapUtilities.js)
    const pts = dataset.median; // [lon, lat] pairs

    for (let i = 1; i < pts.length; i++) {
        const lon0 = pts[i - 1][0];
        const lat0 = pts[i - 1][1];
        const lon1 = pts[i][0];
        const lat1 = pts[i][1];

        // Check for antimeridian crossing (lon jump > 180°)
        if (Math.abs(lon1 - lon0) > 180) {
            // Interpolate the crossing latitude
            let uLon0 = lon0;
            let uLon1 = lon1;
            if (uLon0 > 0 && uLon1 < 0) {
                uLon1 += 360;
            } else if (uLon0 < 0 && uLon1 > 0) {
                uLon1 -= 360;
            }
            const target = uLon0 > 0 ? 180 : -180;
            const t = (uLon1 !== uLon0) ? (target - uLon0) / (uLon1 - uLon0) : 0.5;
            const latCross = lat0 + t * (lat1 - lat0);

            // Segment up to boundary
            if (lon0 > 0) {
                pushSegment(series, [lon0, lat0], [180, latCross]);
                pushSegment(series, [-180, latCross], [lon1, lat1]);
            } else {
                pushSegment(series, [lon0, lat0], [-180, latCross]);
                pushSegment(series, [180, latCross], [lon1, lat1]);
            }
        } else {
            pushSegment(series, [lon0, lat0], [lon1, lat1]);
        }
    }

    series.mapLines.template.set("tooltipText", tooltipText);
}

/**
 * Push a single 2-point LineString segment onto a MapLineSeries.
 */
function pushSegment(series, coordA, coordB) {
    series.pushDataItem({
        geometry: {
            type: "LineString",
            coordinates: [coordA, coordB]
        }
    });
}
