const diagnosticsEnabled = new URLSearchParams(window.location.search).has('diagnostics');

let mainChart = null;
let creationCount = 0;
let disposalCount = 0;

function getContainerState() {
  const element = document.getElementById('chartdiv1');
  if (!element) return { width: 0, height: 0 };

  const bounds = element.getBoundingClientRect();
  return { width: bounds.width, height: bounds.height };
}

function hasVisibleMapPixels() {
  const canvas = document.querySelector('#chartdiv1 canvas');
  if (!canvas || canvas.width === 0 || canvas.height === 0) return false;

  const context = canvas.getContext('2d');
  if (!context) return false;

  const image = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const stride = Math.max(4, Math.floor((canvas.width * canvas.height) / 5_000) * 4);
  for (let index = 0; index < image.length; index += stride) {
    const red = image[index];
    const green = image[index + 1];
    const blue = image[index + 2];
    const alpha = image[index + 3];
    if (alpha > 20 && (red < 245 || green < 245 || blue < 245)) return true;
  }
  return false;
}

function snapshotMainMap() {
  const container = getContainerState();
  return {
    creationCount,
    disposalCount,
    container,
    rendered: Boolean(mainChart) && container.width > 0 && container.height > 0 && hasVisibleMapPixels(),
    rotationX: mainChart?.get('rotationX'),
    rotationY: mainChart?.get('rotationY'),
    zoomLevel: mainChart?.get('zoomLevel')
  };
}

export function recordMainChartCreated(chart) {
  mainChart = chart;
  creationCount += 1;
}

export function recordMainChartDisposed(chart) {
  if (mainChart === chart) mainChart = null;
  disposalCount += 1;
}

if (diagnosticsEnabled) {
  window.__gcvDiagnostics = {
    mainMap: snapshotMainMap
  };
}
