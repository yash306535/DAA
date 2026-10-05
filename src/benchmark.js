'use strict';
/**
 * benchmark.js — runs the four methods and measures them.
 *
 * Timing is split into two phases for every multithreaded method:
 *   creation time    = from `new Worker(...)` until every thread has posted 'ready'
 *   computation time = from sending 'start' until every thread has posted 'done'
 *
 * Each measurement is repeated `runs` times (default 3) and we report the
 * average, minimum and maximum. Every result is compared with the
 * single-threaded answer to prove correctness.
 */
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');
const { performance } = require('perf_hooks');
const M = require('./matrix');

/** Fixed seeds -> the same A and B every time (the browser uses the same ones). */
const SEED_A = 12345;
const SEED_B = 67890;

/** Number of CPU cores Node can actually use (os.availableParallelism is Node 18.14+). */
function cpuCount() {
  return typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length || 1;
}

/**
 * Maximum number of worker threads alive at the same time.
 * Each Node worker is a full V8 instance (several MB of RAM). 300 of them at once
 * would crash a 512 MB Render instance, so "one thread per row" is executed in
 * waves of MAX_LIVE_WORKERS threads. Every row still gets its own thread.
 */
const MAX_LIVE_WORKERS = Math.max(1, parseInt(process.env.MAX_LIVE_WORKERS, 10) || 16);

/** Allowed methods and their size limits (also sent to the frontend). */
const METHODS = {
  single: { label: 'Single-threaded', maxSize: 512 },
  row: { label: 'Thread per row', maxSize: 300 },
  cell: { label: 'Thread per cell', maxSize: 12 },
  pool: { label: 'Thread pool (cores)', maxSize: 512 },
};
const MIN_SIZE = 2;
const MAX_RUNS = 5;

const WORKER_FILES = {
  row: path.join(__dirname, 'workers', 'rowWorker.js'),
  cell: path.join(__dirname, 'workers', 'cellWorker.js'),
  pool: path.join(__dirname, 'workers', 'poolWorker.js'),
};

/** Resolve when `worker` posts `message`; reject if it crashes or exits early. */
function waitFor(worker, message) {
  return new Promise((resolve, reject) => {
    const onMessage = (msg) => {
      if (msg === message) {
        cleanup();
        resolve();
      }
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`Worker exited with code ${code} before sending '${message}'`));
    };
    function cleanup() {
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
    }
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.on('exit', onExit);
  });
}

/**
 * Run one task per thread, at most MAX_LIVE_WORKERS threads at a time.
 * Returns { creationMs, computeMs } summed over all waves.
 */
async function runThreads(file, tasks) {
  let creationMs = 0;
  let computeMs = 0;

  for (let s = 0; s < tasks.length; s += MAX_LIVE_WORKERS) {
    const wave = tasks.slice(s, s + MAX_LIVE_WORKERS);

    // Phase 1 — create the threads and wait until each one is running.
    const t0 = performance.now();
    const workers = wave.map((workerData) => new Worker(file, { workerData }));
    try {
      await Promise.all(workers.map((w) => waitFor(w, 'ready')));
      const t1 = performance.now();

      // Phase 2 — tell every thread to start and wait for all of them to finish.
      const finished = Promise.all(workers.map((w) => waitFor(w, 'done')));
      workers.forEach((w) => w.postMessage('start'));
      await finished;
      const t2 = performance.now();

      creationMs += t1 - t0;
      computeMs += t2 - t1;
    } finally {
      // Clean up (not timed). Threads would exit on their own; this is a safety net.
      await Promise.all(workers.map((w) => w.terminate()));
    }
  }
  return { creationMs, computeMs };
}

/** Build the list of per-thread jobs for a method. */
function buildTasks(method, n, bufs) {
  const tasks = [];
  if (method === 'row') {
    for (let row = 0; row < n; row++) tasks.push({ ...bufs, n, row });
  } else if (method === 'cell') {
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) tasks.push({ ...bufs, n, row, col });
    }
  } else if (method === 'pool') {
    const parts = Math.min(cpuCount(), n);
    for (const [startRow, endRow] of M.splitRows(n, parts)) {
      tasks.push({ ...bufs, n, startRow, endRow });
    }
  }
  return tasks;
}

/** Throw a readable error if (method, n, runs) is not allowed. */
function validate(method, n, runs) {
  const spec = METHODS[method];
  if (!spec) throw new Error(`Unknown method "${method}"`);
  if (!Number.isInteger(n) || n < MIN_SIZE || n > spec.maxSize) {
    throw new Error(`${spec.label} supports sizes ${MIN_SIZE}..${spec.maxSize}`);
  }
  if (!Number.isInteger(runs) || runs < 1 || runs > MAX_RUNS) {
    throw new Error(`runs must be 1..${MAX_RUNS}`);
  }
}

const round = (x) => Math.round(x * 1000) / 1000;
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Multiply two random n×n matrices with `method`, `runs` times.
 * Returns timing statistics, threads used, correctness and a 5×5 preview.
 */
async function runMethod(method, n, runs = 3) {
  validate(method, n, runs);

  const A = M.fillRandom(M.createSharedMatrix(n), SEED_A);
  const B = M.fillRandom(M.createSharedMatrix(n), SEED_B);
  const C = M.createSharedMatrix(n);

  // Reference answer (untimed) used for the correctness check.
  const reference = new Float64Array(n * n);
  M.multiplySingle(A, B, reference, n);

  const bufs = { aBuf: A.buffer, bBuf: B.buffer, cBuf: C.buffer };
  const tasks = method === 'single' ? [] : buildTasks(method, n, bufs);
  const threads = method === 'single' ? 1 : tasks.length;

  const totals = [];
  const creations = [];
  const computes = [];
  let correct = true;

  for (let r = 0; r < runs; r++) {
    C.fill(0); // start every run from an empty result

    let creationMs = 0;
    let computeMs = 0;
    if (method === 'single') {
      const t0 = performance.now();
      M.multiplySingle(A, B, C, n);
      computeMs = performance.now() - t0;
    } else {
      ({ creationMs, computeMs } = await runThreads(WORKER_FILES[method], tasks));
    }

    totals.push(creationMs + computeMs);
    creations.push(creationMs);
    computes.push(computeMs);
    if (!M.equals(C, reference)) correct = false;
  }

  return {
    method,
    label: METHODS[method].label,
    size: n,
    runs,
    threads,
    maxLiveThreads: method === 'single' ? 1 : Math.min(threads, MAX_LIVE_WORKERS),
    avgMs: round(avg(totals)),
    minMs: round(Math.min(...totals)),
    maxMs: round(Math.max(...totals)),
    creationMs: round(avg(creations)),
    computeMs: round(avg(computes)),
    times: totals.map(round),
    correct,
    preview: M.preview(C, n),
  };
}

/**
 * Run every requested method for every requested size.
 * A method whose size limit is exceeded is reported as skipped (not an error).
 */
async function runBenchmark({ sizes, methods, runs = 3 }) {
  const results = [];
  for (const n of sizes) {
    for (const method of methods) {
      const spec = METHODS[method];
      if (n > spec.maxSize) {
        results.push({
          method,
          label: spec.label,
          size: n,
          skipped: true,
          reason: `${spec.label} is limited to n ≤ ${spec.maxSize}`,
        });
        continue;
      }
      results.push(await runMethod(method, n, runs));
    }
  }

  // Speedup of each method relative to single-threaded at the same size.
  for (const r of results) {
    if (r.skipped) continue;
    const base = results.find((x) => x.size === r.size && x.method === 'single' && !x.skipped);
    r.speedup = base && r.avgMs > 0 && base.avgMs > 0 ? Number((base.avgMs / r.avgMs).toPrecision(4)) : null;
  }

  return { cores: cpuCount(), maxLiveWorkers: MAX_LIVE_WORKERS, runs, results };
}

module.exports = {
  METHODS,
  MIN_SIZE,
  MAX_RUNS,
  MAX_LIVE_WORKERS,
  SEED_A,
  SEED_B,
  cpuCount,
  runMethod,
  runBenchmark,
};
