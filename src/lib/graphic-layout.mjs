// Layout maths for the drawn device graphics. Pure functions, so the drawings stay correct for any
// port count that appears in the catalog (8-port desktop switches up to 192-port chassis).

export const MAX_COLS = 24; // a rack switch front panel holds at most 24 ports per row

/** Rows and columns for a port count. Invalid counts give an empty grid. */
export function portGrid(ports, maxCols = MAX_COLS) {
  if (!Number.isInteger(ports) || ports <= 0) return { rows: 0, cols: 0 };
  if (ports <= maxCols) return { rows: 1, cols: ports };
  const rows = Math.ceil(ports / maxCols);
  return { rows, cols: Math.ceil(ports / rows) };
}

/** Size of one port cell so that `cols` cells fit in `availableWidth`, clamped to [min, max]. */
export function cellSize(cols, availableWidth, { gap = 2, max = 14, min = 4 } = {}) {
  if (cols <= 0) return 0;
  const fit = (availableWidth - gap * (cols - 1)) / cols;
  return Math.max(min, Math.min(max, fit));
}

/** Width and height of a grid of cells. */
export function gridSize(rows, cols, cell, gap = 2) {
  if (rows <= 0 || cols <= 0) return { width: 0, height: 0 };
  return { width: cols * cell + (cols - 1) * gap, height: rows * cell + (rows - 1) * gap };
}

/** Top-left corner of every port cell, row by row. The last row may be shorter. */
export function portPositions(ports, cell, gap = 2, maxCols = MAX_COLS) {
  const { rows, cols } = portGrid(ports, maxCols);
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols && out.length < ports; c++) {
      out.push({ x: c * (cell + gap), y: r * (cell + gap), row: r, col: c });
    }
  }
  return out;
}

/** Height in drawing units of a rack device: 1U is 44, each extra unit adds 36. */
export function rackHeight(rackUnits = 1) {
  const u = Number.isFinite(rackUnits) && rackUnits >= 1 ? Math.round(rackUnits) : 1;
  return 44 + (u - 1) * 36;
}

/** Points on a Wi-Fi arc below a centre, for a given radius: [x1, y1, x2, y2]. */
export function wifiArc(cx, cy, r) {
  const a = (50 * Math.PI) / 180;
  const dx = r * Math.sin(a);
  const dy = r * Math.cos(a);
  return [cx - dx, cy + dy, cx + dx, cy + dy].map((n) => Math.round(n * 10) / 10);
}
