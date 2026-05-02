import type { RouteResponse } from './types';

export function generateGPX(route: RouteResponse, cityName: string, distanceMiles: number): string {
  const now = new Date().toISOString();
  const safeName = cityName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  const filename = `running-maps-${safeName}-${distanceMiles}mi`;

  const waypoints = route.optimized_order.map(place => `
  <wpt lat="${place.location.lat}" lon="${place.location.lng}">
    <name>${escapeXml(place.name)}</name>
    <desc>${escapeXml(place.types[0]?.replace(/_/g, ' ') || 'place')}</desc>
  </wpt>`).join('');

  // Build a simple track from start through waypoints (using place locations as track points)
  const trackPoints = route.optimized_order.map(place =>
    `    <trkpt lat="${place.location.lat}" lon="${place.location.lng}"></trkpt>`
  ).join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Running Maps" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(filename)}</name>
    <time>${now}</time>
  </metadata>
${waypoints}
  <trk>
    <name>${escapeXml(filename)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

export function downloadGPX(gpxContent: string, cityName: string, distanceMiles: number): void {
  const safeName = cityName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  const filename = `running-maps-${safeName}-${distanceMiles}mi.gpx`;

  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
