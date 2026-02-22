// Quick script to compute great circle intermediate points for LAX-DXB
const toRad = d => d * Math.PI / 180;
const toDeg = r => r * 180 / Math.PI;

function gcInterpolate(lat1d, lon1d, lat2d, lon2d, n) {
  const lat1 = toRad(lat1d), lon1 = toRad(lon1d);
  const lat2 = toRad(lat2d), lon2 = toRad(lon2d);
  
  // Angular distance
  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );
  
  const points = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lon = toDeg(Math.atan2(y, x));
    points.push([Math.round(lon * 10000) / 10000, Math.round(lat * 10000) / 10000]);
  }
  return points;
}

// LAX: 33.9425, -118.408  DXB: 25.2528, 55.3644
const pts = gcInterpolate(33.9425, -118.408, 25.2528, 55.3644, 20);

console.log("Great circle LAX->DXB (21 points):");
console.log("Peak latitude:", Math.max(...pts.map(p => p[1])).toFixed(1));
pts.forEach((p, i) => {
  console.log("  " + i + ": [" + p[0] + ", " + p[1] + "]");
});
