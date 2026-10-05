'use strict';
/**
 * server.js — Express server for the Matrix Multiplication Benchmark.
 *
 * Routes
 *   GET  /api/system     CPU cores, Node version, platform, memory, method limits
 *   POST /api/multiply   { size, method, runs? }     -> one method, one size
 *   POST /api/benchmark  { sizes, methods, runs? }   -> full comparison
 *   GET  /api/health     health check for Render
 *   everything else      static files from /public
 *
 * Safety: benchmarks never run on this (main) thread. Each request becomes a
 * "job" that runs inside its own worker thread (src/workers/jobWorker.js). Jobs
 * run one at a time from a short queue and are killed after a timeout, so one
 * heavy request can never freeze the server.
 */
const express = require('express');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');
const { METHODS, MIN_SIZE, MAX_RUNS, MAX_LIVE_WORKERS, SEED_A, SEED_B, cpuCount } = require('./src/benchmark');

const PORT = process.env.PORT || 3000;
const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS, 10) || 120000;
const MAX_QUEUE = 5; // waiting jobs allowed before we answer 429 "busy"
const MAX_BENCH_SIZES = 6;

const app = express();
app.disable('x-powered-by');

/* ------------------------------------------------------------------ headers */
app.use((req, res, next) => {
  // Cross-origin isolation: required by browsers to enable SharedArrayBuffer,
  // which the "Run on my device" mode uses to share matrices with Web Workers.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

/* -------------------------------------------------------------- job queue */
const queue = [];
let running = false;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Add a job to the queue; resolves with the job's result. */
function enqueue(type, params) {
  if (queue.length >= MAX_QUEUE) {
    return Promise.reject(new HttpError(429, 'Server is busy running other benchmarks. Try again in a few seconds.'));
  }
  return new Promise((resolve, reject) => {
    queue.push({ type, params, resolve, reject });
    processQueue();
  });
}

function processQueue() {
  if (running || queue.length === 0) return;
  running = true;
  const job = queue.shift();

  const worker = new Worker(path.join(__dirname, 'src', 'workers', 'jobWorker.js'), {
    workerData: { type: job.type, params: job.params },
  });
  let settled = false;
  const finish = (fn, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    worker.terminate(); // also stops any row/cell/pool workers it started
    running = false;
    fn(value);
    processQueue();
  };

  const timer = setTimeout(() => {
    finish(job.reject, new HttpError(503, `Benchmark took longer than ${JOB_TIMEOUT_MS / 1000}s and was stopped. Try smaller sizes or fewer methods.`));
  }, JOB_TIMEOUT_MS);

  worker.once('message', (msg) => {
    if (msg.ok) finish(job.resolve, msg.result);
    else finish(job.reject, new HttpError(400, msg.error));
  });
  worker.once('error', (err) => finish(job.reject, new HttpError(500, `Worker crashed: ${err.message}`)));
  worker.once('exit', (code) => finish(job.reject, new HttpError(500, `Worker stopped unexpectedly (code ${code})`)));
}

/* ------------------------------------------------------------- validation */
function parseRuns(value) {
  if (value === undefined) return 3;
  if (!Number.isInteger(value) || value < 1 || value > MAX_RUNS) {
    throw new HttpError(400, `"runs" must be an integer from 1 to ${MAX_RUNS}`);
  }
  return value;
}

function parseMethod(value) {
  if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(METHODS, value)) {
    throw new HttpError(400, `"method" must be one of: ${Object.keys(METHODS).join(', ')}`);
  }
  return value;
}

function parseSize(value, max) {
  if (!Number.isInteger(value) || value < MIN_SIZE || value > max) {
    throw new HttpError(400, `"size" must be an integer from ${MIN_SIZE} to ${max}`);
  }
  return value;
}

/* ------------------------------------------------------------------ routes */
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/system', (req, res) => {
  const cpus = os.cpus();
  res.json({
    cores: cpuCount(),
    cpuModel: cpus.length ? cpus[0].model.trim() : 'unknown',
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()} (${process.arch})`,
    totalMemoryMB: Math.round(os.totalmem() / 1048576),
    freeMemoryMB: Math.round(os.freemem() / 1048576),
    maxLiveWorkers: MAX_LIVE_WORKERS,
    limits: { minSize: MIN_SIZE, maxRuns: MAX_RUNS, maxBenchmarkSizes: MAX_BENCH_SIZES, methods: METHODS },
    seeds: { a: SEED_A, b: SEED_B },
    queueLength: queue.length + (running ? 1 : 0),
  });
});

app.post('/api/multiply', async (req, res, next) => {
  try {
    const body = req.body || {};
    const method = parseMethod(body.method);
    const size = parseSize(body.size, METHODS[method].maxSize);
    const runs = parseRuns(body.runs);
    res.json(await enqueue('multiply', { method, size, runs }));
  } catch (err) {
    next(err);
  }
});

app.post('/api/benchmark', async (req, res, next) => {
  try {
    const body = req.body || {};
    const maxSize = Math.max(...Object.values(METHODS).map((m) => m.maxSize));

    const sizes = body.sizes === undefined ? [50, 100, 200, 300] : body.sizes;
    if (!Array.isArray(sizes) || sizes.length === 0 || sizes.length > MAX_BENCH_SIZES) {
      throw new HttpError(400, `"sizes" must be an array of 1 to ${MAX_BENCH_SIZES} integers`);
    }
    sizes.forEach((s) => parseSize(s, maxSize));

    const methods = body.methods === undefined ? Object.keys(METHODS) : body.methods;
    if (!Array.isArray(methods) || methods.length === 0) {
      throw new HttpError(400, '"methods" must be a non-empty array');
    }
    methods.forEach(parseMethod);

    const runs = parseRuns(body.runs);
    const uniqueSizes = [...new Set(sizes)].sort((a, b) => a - b);
    // Always include single-threaded: it is the baseline for speedup.
    const uniqueMethods = [...new Set(['single', ...methods])];

    res.json(await enqueue('benchmark', { sizes: uniqueSizes, methods: uniqueMethods, runs }));
  } catch (err) {
    next(err);
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: `No API route ${req.method} ${req.originalUrl}` }));

/* ---------------------------------------------------------- error handler */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Matrix benchmark running on http://localhost:${PORT}  (cores: ${cpuCount()}, max live workers: ${MAX_LIVE_WORKERS})`);
});
