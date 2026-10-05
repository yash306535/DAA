/**
 * browserBench.js — the same benchmark as src/benchmark.js, but running on the
 * visitor's own computer with Web Workers ("Run on my device").
 *
 * Results use exactly the same shape as the server API, so the UI can display
 * either one without caring where it came from.
 */
(function (root) {
  'use strict';
  const MC = root.MatrixCore;

  const METHODS = {
    single: { label: 'Single-threaded', maxSize: 512 },
    row: { label: 'Thread per row', maxSize: 300 },
    cell: { label: 'Thread per cell', maxSize: 12 },
    pool: { label: 'Thread pool (cores)', maxSize: 512 },
  };

  /** SharedArrayBuffer only works when the page is cross-origin isolated (see server.js headers). */
  const SHARED = typeof SharedArrayBuffer !== 'undefined' && root.crossOriginIsolated === true;
  const CORES = navigator.hardwareConcurrency || 4;
  /** Max Web Workers alive at once (each is a real OS thread with its own JS engine). */
  const MAX_LIVE = 64;
  const WORKER_URL = 'js/browserWorker.js';

  function alloc(n) {
    return SHARED ? new Float64Array(new SharedArrayBuffer(n * n * 8)) : new Float64Array(n * n);
  }

  /** Resolve with the worker's message once it posts {type}; reject on error. */
  function waitFor(worker, type) {
    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data && e.data.type === type) resolve(e.data);
      };
      worker.onerror = (e) => reject(new Error(e.message || 'Web Worker failed to load'));
    });
  }

  /** Run each task in its own Web Worker, MAX_LIVE at a time. */
  async function runThreads(tasks, A, B, C, n) {
    let creationMs = 0;
    let computeMs = 0;
    for (let s = 0; s < tasks.length; s += MAX_LIVE) {
      const wave = tasks.slice(s, s + MAX_LIVE);

      // Phase 1 — create the threads.
      const t0 = performance.now();
      const workers = wave.map(() => new Worker(WORKER_URL));
      try {
        await Promise.all(workers.map((w) => waitFor(w, 'ready')));
        const t1 = performance.now();

        // Phase 2 — hand out the work and wait for every thread to finish.
        const finished = Promise.all(workers.map((w) => waitFor(w, 'done')));
        workers.forEach((w, idx) => {
          const msg = SHARED
            ? { shared: true, n, task: wave[idx], aBuf: A.buffer, bBuf: B.buffer, cBuf: C.buffer }
            : { shared: false, n, task: wave[idx], A, B }; // structured clone = copy
          w.postMessage(msg);
        });
        const replies = await finished;
        if (!SHARED) replies.forEach((r) => C.set(r.values, r.from));
        const t2 = performance.now();

        creationMs += t1 - t0;
        computeMs += t2 - t1;
      } finally {
        workers.forEach((w) => w.terminate());
      }
    }
    return { creationMs, computeMs };
  }

  function buildTasks(method, n) {
    const tasks = [];
    if (method === 'row') {
      for (let i = 0; i < n; i++) tasks.push({ kind: 'rows', start: i, end: i + 1 });
    } else if (method === 'cell') {
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) tasks.push({ kind: 'cell', i, j });
    } else if (method === 'pool') {
      MC.splitRows(n, Math.min(CORES, n)).forEach(([start, end]) => tasks.push({ kind: 'rows', start, end }));
    }
    return tasks;
  }

  const round = (x) => Math.round(x * 1000) / 1000;
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const nextFrame = () => new Promise((r) => setTimeout(r, 0));

  async function runMethod(method, n, runs) {
    runs = runs || 3;
    const spec = METHODS[method];
    if (!spec) throw new Error('Unknown method ' + method);
    if (!Number.isInteger(n) || n < 2 || n > spec.maxSize) {
      throw new Error(spec.label + ' supports sizes 2..' + spec.maxSize);
    }

    const A = MC.fillRandom(alloc(n), MC.SEED_A);
    const B = MC.fillRandom(alloc(n), MC.SEED_B);
    const C = alloc(n);
    const reference = new Float64Array(n * n);
    MC.multiplySingle(A, B, reference, n);

    const tasks = method === 'single' ? [] : buildTasks(method, n);
    const threads = method === 'single' ? 1 : tasks.length;
    const totals = [];
    const creations = [];
    const computes = [];
    let correct = true;

    for (let r = 0; r < runs; r++) {
      await nextFrame(); // let the page repaint (progress bar) between runs
      C.fill(0);
      let creationMs = 0;
      let computeMs = 0;
      if (method === 'single') {
        const t0 = performance.now();
        MC.multiplySingle(A, B, C, n);
        computeMs = performance.now() - t0;
      } else {
        ({ creationMs, computeMs } = await runThreads(tasks, A, B, C, n));
      }
      totals.push(creationMs + computeMs);
      creations.push(creationMs);
      computes.push(computeMs);
      if (!MC.equals(C, reference)) correct = false;
    }

    return {
      method,
      label: spec.label,
      size: n,
      runs,
      threads,
      maxLiveThreads: method === 'single' ? 1 : Math.min(threads, MAX_LIVE),
      avgMs: round(avg(totals)),
      minMs: round(Math.min(...totals)),
      maxMs: round(Math.max(...totals)),
      creationMs: round(avg(creations)),
      computeMs: round(avg(computes)),
      times: totals.map(round),
      correct,
      preview: MC.preview(C, n),
    };
  }

  /** Same output shape as POST /api/benchmark. onStep(done, total, label) reports progress. */
  async function runBenchmark(opts, onStep) {
    const { sizes, methods, runs } = opts;
    const results = [];
    const total = sizes.length * methods.length;
    let done = 0;
    for (const n of sizes) {
      for (const method of methods) {
        const spec = METHODS[method];
        if (onStep) onStep(done, total, spec.label + ' · n = ' + n);
        if (n > spec.maxSize) {
          results.push({ method, label: spec.label, size: n, skipped: true, reason: spec.label + ' is limited to n ≤ ' + spec.maxSize });
        } else {
          results.push(await runMethod(method, n, runs));
        }
        done++;
      }
    }
    if (onStep) onStep(done, total, 'Done');
    results.forEach((r) => {
      if (r.skipped) return;
      const base = results.find((x) => x.size === r.size && x.method === 'single' && !x.skipped);
      r.speedup = base && r.avgMs > 0 && base.avgMs > 0 ? Number((base.avgMs / r.avgMs).toPrecision(4)) : null;
    });
    return { cores: CORES, maxLiveWorkers: MAX_LIVE, runs, results };
  }

  root.BrowserBench = { METHODS, SHARED, CORES, MAX_LIVE, runMethod, runBenchmark };
})(window);
