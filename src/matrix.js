'use strict';
/**
 * matrix.js — the core of the project.
 *
 * Every matrix is an n×n grid stored in ONE flat Float64Array in row-major order:
 *
 *     element (i, j)  ->  index  i * n + j
 *
 * The Float64Array is backed by a SharedArrayBuffer, so every worker thread sees
 * the SAME memory. Workers read A and B and write their part of C directly —
 * nothing is copied between threads.
 *
 * All four methods (single, row, cell, pool) call the same kernel functions
 * defined here (computeCell / computeRow / computeRows). Only the way the work
 * is split between threads changes, which is why all results must be identical.
 */

/** Allocate an n×n matrix of zeros in shared memory. */
function createSharedMatrix(n) {
  const buffer = new SharedArrayBuffer(n * n * Float64Array.BYTES_PER_ELEMENT);
  return new Float64Array(buffer);
}

/**
 * Small seeded pseudo-random generator (mulberry32).
 * A fixed seed gives the same "random" matrices on the server AND in the browser,
 * so the live visualizer can show exactly the numbers the server multiplied.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fill a matrix with integers 0..9.
 * Small integers keep every product and sum exact in a 64-bit float, so
 * "identical result" can be checked with strict equality.
 */
function fillRandom(M, seed) {
  const rand = mulberry32(seed);
  for (let i = 0; i < M.length; i++) M[i] = Math.floor(rand() * 10);
  return M;
}

/** C[i][j] = sum over k of A[i][k] * B[k][j]   — one cell, O(n) work. */
function computeCell(A, B, C, n, i, j) {
  let sum = 0;
  const rowStart = i * n;
  for (let k = 0; k < n; k++) {
    sum += A[rowStart + k] * B[k * n + j];
  }
  C[rowStart + j] = sum;
}

/** One full row i of C — O(n²) work. */
function computeRow(A, B, C, n, i) {
  for (let j = 0; j < n; j++) computeCell(A, B, C, n, i, j);
}

/** Rows startRow .. endRow-1 of C — used by the thread pool. */
function computeRows(A, B, C, n, startRow, endRow) {
  for (let i = startRow; i < endRow; i++) computeRow(A, B, C, n, i);
}

/**
 * Method 1: classic single-threaded multiplication.
 * Three nested loops (i, j, k) -> n * n * n multiply-adds -> O(n³).
 */
function multiplySingle(A, B, C, n) {
  computeRows(A, B, C, n, 0, n);
  return C;
}

/** True when two matrices are element-for-element identical. */
function equals(X, Y) {
  if (X.length !== Y.length) return false;
  for (let i = 0; i < X.length; i++) {
    if (X[i] !== Y[i]) return false;
  }
  return true;
}

/** Top-left size×size corner as a normal 2-D array (for the API preview). */
function preview(M, n, size = 5) {
  const k = Math.min(size, n);
  const out = [];
  for (let i = 0; i < k; i++) {
    const row = [];
    for (let j = 0; j < k; j++) row.push(M[i * n + j]);
    out.push(row);
  }
  return out;
}

/**
 * Split n rows into `parts` contiguous chunks whose sizes differ by at most 1.
 * Example: n = 10, parts = 4  ->  [0,3) [3,6) [6,8) [8,10)
 */
function splitRows(n, parts) {
  const chunks = [];
  const base = Math.floor(n / parts);
  const extra = n % parts;
  let start = 0;
  for (let p = 0; p < parts; p++) {
    const size = base + (p < extra ? 1 : 0);
    if (size === 0) continue;
    chunks.push([start, start + size]);
    start += size;
  }
  return chunks;
}

module.exports = {
  createSharedMatrix,
  mulberry32,
  fillRandom,
  computeCell,
  computeRow,
  computeRows,
  multiplySingle,
  equals,
  preview,
  splitRows,
};
