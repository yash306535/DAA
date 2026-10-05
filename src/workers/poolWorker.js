'use strict';
/**
 * poolWorker.js — the optimized "thread pool".
 * Only as many threads as there are CPU cores are created, and each one gets a
 * contiguous block of rows [startRow, endRow). Every core stays busy and the
 * thread-creation cost is paid only a handful of times.
 */
const { parentPort, workerData } = require('worker_threads');
const { computeRows } = require('../matrix');

const { aBuf, bBuf, cBuf, n, startRow, endRow } = workerData;
const A = new Float64Array(aBuf);
const B = new Float64Array(bBuf);
const C = new Float64Array(cBuf);

parentPort.once('message', () => {
  computeRows(A, B, C, n, startRow, endRow);
  parentPort.postMessage('done');
});

parentPort.postMessage('ready');
