'use strict';
/**
 * jobWorker.js — runs one API request's benchmark OFF the main thread.
 *
 * The Express main thread must never be blocked by an O(n³) loop, otherwise the
 * whole server would stop answering requests. So server.js starts this worker
 * per job; it runs the benchmark (and spawns the row/cell/pool workers itself)
 * and posts the result back. If it takes too long, server.js terminates it,
 * which also terminates every worker it created.
 */
const { parentPort, workerData } = require('worker_threads');
const { runMethod, runBenchmark } = require('../benchmark');

(async () => {
  try {
    const { type, params } = workerData;
    const result =
      type === 'benchmark'
        ? await runBenchmark(params)
        : await runMethod(params.method, params.size, params.runs);
    parentPort.postMessage({ ok: true, result });
  } catch (err) {
    parentPort.postMessage({ ok: false, error: err.message });
  }
})();
