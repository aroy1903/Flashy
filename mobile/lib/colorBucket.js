// Map any hex color to a coarse hue bucket for sorting and accessible labels.
// Filtering itself must still use the exact hex value so close colors stay distinct.

function hexToHsl(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 0];
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return [0, 0, 0];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return [hue * 60, s, l];
}

export function colorBucket(hex) {
  const [hue, sat, light] = hexToHsl(hex);
  if (sat < 0.12 || light < 0.05 || light > 0.95) return 'gray';
  if (hue < 10 || hue >= 355) return 'red';
  if (hue < 35) return 'orange';
  if (hue < 65) return 'yellow';
  if (hue < 160) return 'green';
  if (hue < 200) return 'teal';
  if (hue < 250) return 'blue';
  if (hue < 290) return 'purple';
  return 'pink';
}
