/**
 * browserWorker.js — the Web Worker used by "Run on my device".
 *
 * One generic worker handles all three multithreaded methods; the task it
 * receives says what to compute:
 *   { kind: 'rows', start, end }  -> thread per row (end = start + 1) or a pool chunk
 *   { kind: 'cell', i, j }        -> thread per cell
 *
 * Shared mode (page is cross-origin isolated): A, B and C are Float64Arrays on a
 * SharedArrayBuffer. The worker writes straight into C — nothing is copied.
 *
 * Copy mode (fallback when SharedArrayBuffer is unavailable): A and B arrive as
 * copies, and the worker sends its computed values back to the page.
 */
importScripts('matrixCore.js');

self.onmessage = function (e) {
  const { n, task, shared } = e.data;
  const A = shared ? new Float64Array(e.data.aBuf) : e.data.A;
  const B = shared ? new Float64Array(e.data.bBuf) : e.data.B;
  const C = shared ? new Float64Array(e.data.cBuf) : new Float64Array(n * n);

  if (task.kind === 'rows') {
    MatrixCore.computeRows(A, B, C, n, task.start, task.end);
  } else {
    MatrixCore.computeCell(A, B, C, n, task.i, task.j);
  }

  if (shared) {
    self.postMessage({ type: 'done' });
    return;
  }
  // Copy mode: send back only the part this worker computed.
  const from = task.kind === 'rows' ? task.start * n : task.i * n + task.j;
  const to = task.kind === 'rows' ? task.end * n : from + 1;
  const values = C.slice(from, to);
  self.postMessage({ type: 'done', from, values }, [values.buffer]);
};

// The script has loaded: this thread now exists and is ready for work.
self.postMessage({ type: 'ready' });
