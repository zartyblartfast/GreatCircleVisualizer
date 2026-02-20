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
 * Splits at the antimeridian to avoid wraparound artefacts.
 */
function drawMedianLine(series, dataset, origin, dest) {
    if (!dataset || !dataset.median || dataset.median.length < 2) return;

    const segments = splitAtAntimeridian(dataset.median);

    const tooltipText =
        `[bold]Typical Route: ${origin}→${dest}[/]` +
        `\nBased on ${dataset.nFlights} flights` +
        (dataset.dateFrom && dataset.dateTo
            ? `\nPeriod: ${dataset.dateFrom} to ${dataset.dateTo}`
            : "") +
        `\n${dataset.kPoints} track points`;

    for (const seg of segments) {
        if (seg.length < 2) continue;

        series.pushDataItem({
            geometry: {
                type: "LineString",
                coordinates: seg
            }
        });
    }

    series.mapLines.template.set("tooltipText", tooltipText);
}

/**
 * Split a polyline at antimeridian (±180°) crossings.
 * Returns array of segments, each safe to render without wraparound.
 *
 * @param {Array<[number, number]>} points  Array of [lon, lat]
 * @returns {Array<Array<[number, number]>>}
 */
function splitAtAntimeridian(points) {
    if (points.length < 2) return [points];

    const segments = [];
    let current = [[normLon(points[0][0]), points[0][1]]];

    for (let i = 1; i < points.length; i++) {
        const prev = current[current.length - 1];
        const next = [normLon(points[i][0]), points[i][1]];

        if (Math.abs(next[0] - prev[0]) > 180) {
            // Crossing detected — interpolate boundary points
            const cross = interpolateCrossing(prev, next);

            if (prev[0] > 0) {
                current.push(cross.atPlus180);
                segments.push(current);
                current = [cross.atMinus180, next];
            } else {
                current.push(cross.atMinus180);
                segments.push(current);
                current = [cross.atPlus180, next];
            }
        } else {
            current.push(next);
        }
    }

    if (current.length > 0) {
        segments.push(current);
    }

    return segments;
}

function normLon(lon) {
    while (lon > 180) lon -= 360;
    while (lon <= -180) lon += 360;
    return lon;
}

function interpolateCrossing(a, b) {
    let lonA = a[0];
    let lonB = b[0];
    const latA = a[1];
    const latB = b[1];

    if (lonA > 0 && lonB < 0) {
        lonB += 360;
    } else if (lonA < 0 && lonB > 0) {
        lonA += 360;
    }

    const target = lonA > 180 ? 540 : 180;
    const denom = lonB - lonA;
    const t = denom !== 0 ? (target - lonA) / denom : 0.5;
    const latCross = latA + t * (latB - latA);

    return {
        atPlus180: [180, latCross],
        atMinus180: [-180, latCross]
    };
}
