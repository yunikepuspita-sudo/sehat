// ============================================================================
// SEHAT — Tiny dependency-free SVG chart helpers.
// Keeps the PWA at zero runtime dependencies (cheapest hosting, fast load).
// Returns SVG markup strings rendered straight into innerHTML.
// ============================================================================

const NS = 'xmlns="http://www.w3.org/2000/svg"';

function esc(n) { return Number.isFinite(n) ? n : 0; }

// Radial gauge (e.g. health score 0-100).
export function gauge(value, { size = 168, label = "", color = "#0e9f6e", track = "#1f2937", max = 100 } = {}) {
  const v = Math.max(0, Math.min(max, value));
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = v / max;
  const dash = circ * pct;
  return `
  <svg ${NS} viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${label}: ${v}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="12"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="12"
      stroke-linecap="round" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="${size * 0.26}" font-weight="800" fill="#f8fafc">${Math.round(v)}</text>
    <text x="${cx}" y="${cy + size * 0.16}" text-anchor="middle" font-size="${size * 0.085}" fill="#94a3b8">${label}</text>
  </svg>`;
}

// Vertical bar chart.
export function bars(data, { height = 160, color = "#38bdf8", max = null, fmt = (v) => v } = {}) {
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  const bw = 100 / data.length;
  const rows = data.map((d, i) => {
    const h = (esc(d.value) / m) * 78;
    const x = i * bw + bw * 0.18;
    const w = bw * 0.64;
    const y = 86 - h;
    const c = d.color || color;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${c}"></rect>
      <text x="${x + w / 2}" y="${y - 2}" text-anchor="middle" font-size="3.4" fill="#cbd5e1">${fmt(d.value)}</text>
      <text x="${x + w / 2}" y="98" text-anchor="middle" font-size="3.2" fill="#94a3b8">${d.label}</text>`;
  }).join("");
  return `<svg ${NS} viewBox="0 0 100 100" width="100%" height="${height}" preserveAspectRatio="none" class="chart">${rows}</svg>`;
}

// Line chart (trend).
export function line(series, { height = 150, color = "#0e9f6e", labels = [], min = null, max = null, fill = true } = {}) {
  const n = series.length;
  const lo = min ?? Math.min(...series);
  const hi = max ?? Math.max(...series);
  const span = hi - lo || 1;
  const X = (i) => (i / (n - 1)) * 96 + 2;
  const Y = (v) => 86 - ((v - lo) / span) * 78;
  const pts = series.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const area = `2,86 ${pts} 98,86`;
  const dots = series.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="0.9" fill="${color}"/>`).join("");
  const lab = labels.map((l, i) => `<text x="${X(i)}" y="97" text-anchor="middle" font-size="3" fill="#94a3b8">${l}</text>`).join("");
  return `<svg ${NS} viewBox="0 0 100 100" width="100%" height="${height}" preserveAspectRatio="none" class="chart">
    ${fill ? `<polygon points="${area}" fill="${color}" opacity="0.12"/>` : ""}
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${lab}
  </svg>`;
}

// Donut / pie for distributions.
export function donut(data, { size = 170, thickness = 26 } = {}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const palette = ["#0e9f6e", "#38bdf8", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#94a3b8"];
  const segs = data.map((d, i) => {
    const frac = d.value / total;
    const dash = frac * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color || palette[i % palette.length]}"
      stroke-width="${thickness}" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;
    return seg;
  }).join("");
  return `<svg ${NS} viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="chart">${segs}
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${size * 0.1}" fill="#cbd5e1">${total}%</text></svg>`;
}

export function legend(data) {
  const palette = ["#0e9f6e", "#38bdf8", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#94a3b8"];
  return `<div class="legend">${data.map((d, i) =>
    `<span class="legend-item"><i style="background:${d.color || palette[i % palette.length]}"></i>${d.label} <b>${d.value}%</b></span>`).join("")}</div>`;
}

// Horizontal progress bar.
export function progress(value, max, color = "#0e9f6e") {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `<div class="pbar"><span style="width:${pct}%;background:${color}"></span></div>`;
}
