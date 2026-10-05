'use strict';
/**
 * rowWorker.js — "thread per row".
 * One of these threads is created for EVERY row of the result matrix C.
 * It computes exactly one row: C[row][0..n-1].
 *
 * Protocol (same for all three workers):
 *   1. When the script has loaded, post 'ready'   -> the thread now exists.
 *   2. Wait for the parent's 'start' message      -> creation time ends here.
 *   3. Compute, then post 'done'                   -> computation time ends here.
 */
const { parentPort, workerData } = require('worker_threads');
const { computeRow } = require('../matrix');

const { aBuf, bBuf, cBuf, n, row } = workerData;
// Wrap the SAME shared memory the main thread uses — no copy is made.
const A = new Float64Array(aBuf);
const B = new Float64Array(bBuf);
const C = new Float64Array(cBuf);

parentPort.once('message', () => {
  computeRow(A, B, C, n, row);
  parentPort.postMessage('done');
});

parentPort.postMessage('ready');
