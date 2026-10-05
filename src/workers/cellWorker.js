'use strict';
/**
 * cellWorker.js — "thread per cell".
 * One thread for EVERY cell C[row][col]. Each thread does only n multiply-adds,
 * which is far less work than it costs to create the thread. This worker exists
 * to demonstrate that "more threads" is not automatically "faster".
 */
const { parentPort, workerData } = require('worker_threads');
const { computeCell } = require('../matrix');

const { aBuf, bBuf, cBuf, n, row, col } = workerData;
const A = new Float64Array(aBuf);
const B = new Float64Array(bBuf);
const C = new Float64Array(cBuf);

parentPort.once('message', () => {
  computeCell(A, B, C, n, row, col);
  parentPort.postMessage('done');
});

parentPort.postMessage('ready');
