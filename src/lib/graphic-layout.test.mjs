import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portGrid, cellSize, gridSize, portPositions, rackHeight, wifiArc, MAX_COLS } from './graphic-layout.mjs';

test('portGrid: common switch sizes', () => {
  assert.deepEqual(portGrid(8), { rows: 1, cols: 8 });
  assert.deepEqual(portGrid(24), { rows: 1, cols: 24 });
  assert.deepEqual(portGrid(28), { rows: 2, cols: 14 });
  assert.deepEqual(portGrid(32), { rows: 2, cols: 16 });
  assert.deepEqual(portGrid(48), { rows: 2, cols: 24 });
  assert.deepEqual(portGrid(96), { rows: 4, cols: 24 });
  assert.deepEqual(portGrid(384), { rows: 16, cols: 24 });
});

test('portGrid: invalid counts give an empty grid', () => {
  for (const bad of [0, -4, 1.5, NaN, null, undefined, '24']) assert.deepEqual(portGrid(bad), { rows: 0, cols: 0 });
});

test('portGrid: always holds every port and never exceeds the column limit', () => {
  for (let n = 1; n <= 400; n++) {
    const { rows, cols } = portGrid(n);
    assert.ok(cols <= MAX_COLS, `${n} ports: ${cols} cols`);
    assert.ok(rows * cols >= n, `${n} ports do not fit in ${rows}x${cols}`);
    assert.ok(rows * cols - n < rows, `${n} ports leave a whole empty row`);
  }
});

test('portPositions: one unique cell per port, inside the grid', () => {
  for (const n of [1, 8, 12, 24, 28, 48, 96]) {
    const cell = 8;
    const pos = portPositions(n, cell, 2);
    assert.equal(pos.length, n);
    assert.equal(new Set(pos.map((p) => `${p.x},${p.y}`)).size, n);
    const { rows, cols } = portGrid(n);
    const size = gridSize(rows, cols, cell, 2);
    for (const p of pos) {
      assert.ok(p.x + cell <= size.width + 1e-9 && p.y + cell <= size.height + 1e-9);
    }
  }
  assert.deepEqual(portPositions(0, 8), []);
});

test('cellSize: the grid fits the available width for every port count up to 192', () => {
  const available = 170;
  for (let n = 1; n <= 192; n++) {
    const { rows, cols } = portGrid(n);
    const cell = cellSize(cols, available, { gap: 2, max: 14, min: 4 });
    assert.ok(gridSize(rows, cols, cell, 2).width <= available + 1e-9, `${n} ports overflow`);
    assert.ok(cell >= 4 && cell <= 14);
  }
  assert.equal(cellSize(0, 170), 0);
});

test('rackHeight: 1U is 44, taller devices grow, bad input falls back to 1U', () => {
  assert.equal(rackHeight(1), 44);
  assert.equal(rackHeight(2), 80);
  assert.equal(rackHeight(16), 44 + 15 * 36);
  assert.equal(rackHeight(NaN), 44);
  assert.equal(rackHeight(0), 44);
});

test('wifiArc: symmetric around the centre and below it', () => {
  const [x1, y1, x2, y2] = wifiArc(160, 80, 40);
  assert.equal(Math.round((x1 + x2) / 2), 160);
  assert.equal(y1, y2);
  assert.ok(y1 > 80);
});
