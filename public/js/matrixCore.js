/**
 * matrixCore.js — browser copy of src/matrix.js.
 * Loaded by the page (<script>) AND by every Web Worker (importScripts), so the
 * main thread and the workers use exactly the same multiplication kernel.
 * Matrices are flat row-major Float64Arrays: element (i, j) is at i * n + j.
 */
(function (root) {
  'use strict';

  /** Seeded PRNG (mulberry32) — same seeds as the server, so same matrices. */
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

  /** Fill with integers 0..9 (keeps every sum exact). */
  function fillRandom(M, seed) {
    const rand = mulberry32(seed);
    for (let i = 0; i < M.length; i++) M[i] = Math.floor(rand() * 10);
    return M;
  }

  /** C[i][j] = Σk A[i][k]·B[k][j] */
  function computeCell(A, B, C, n, i, j) {
    let sum = 0;
    const rowStart = i * n;
    for (let k = 0; k < n; k++) sum += A[rowStart + k] * B[k * n + j];
    C[rowStart + j] = sum;
  }

  function computeRow(A, B, C, n, i) {
    for (let j = 0; j < n; j++) computeCell(A, B, C, n, i, j);
  }

  function computeRows(A, B, C, n, startRow, endRow) {
    for (let i = startRow; i < endRow; i++) computeRow(A, B, C, n, i);
  }

  /** Classic O(n³) triple loop. */
  function multiplySingle(A, B, C, n) {
    computeRows(A, B, C, n, 0, n);
    return C;
  }

  function equals(X, Y) {
    if (X.length !== Y.length) return false;
    for (let i = 0; i < X.length; i++) if (X[i] !== Y[i]) return false;
    return true;
  }

  function preview(M, n, size) {
    const k = Math.min(size || 5, n);
    const out = [];
    for (let i = 0; i < k; i++) {
      const row = [];
      for (let j = 0; j < k; j++) row.push(M[i * n + j]);
      out.push(row);
    }
    return out;
  }

  /** Split n rows into `parts` contiguous chunks (sizes differ by at most 1). */
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

  root.MatrixCore = {
    SEED_A: 12345,
    SEED_B: 67890,
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
})(typeof self !== 'undefined' ? self : this);
