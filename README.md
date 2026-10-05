# MatMul Lab: Single vs Multithreaded Matrix Multiplication

**DAA Mini Project 7** · BE Computer Engineering · SPPU · Design & Analysis of Algorithms Lab

A Node.js + Express web app that multiplies matrices four ways (single-threaded, thread per row, thread per cell and an optimized thread pool). It times each method, checks the results against each other, and shows everything on an animated dashboard. You can run the same benchmark **on the server** (Node `worker_threads`) or **on your own device** (browser Web Workers).

---

## 1. Problem statement

> Write a program to implement matrix multiplication. Also implement multithreaded matrix multiplication with either one thread per row or one thread per cell. Analyze and compare their performance.

This project implements **both** thread-per-row and thread-per-cell, plus a thread pool as the optimized approach.

## 2. Features

- **4 algorithms**, each on the server (`worker_threads`) and in the browser (`Web Workers`)
- **Zero-copy threads**: matrices live in a `SharedArrayBuffer` viewed as a `Float64Array`
- **Correctness check**: every result is compared element by element with the single-threaded one (✓ / ✗)
- **Separate timings** for thread creation and computation; each test runs 3× and reports avg / min / max
- **Live visualization** (n ≤ 8): A, B and C as grids, cells light up per thread, and worker "chips" appear, work and exit
- **Benchmark dashboard**: one-click run with a progress bar, an animated SVG line chart (time vs n), a bar chart (speedup), and a sortable table with the fastest method per size highlighted
- **Auto-generated analysis**: insights written from your own numbers, Amdahl's Law estimate, theoretical vs actual speedup
- **Export CSV**, a **print-friendly report** (save as PDF), and a **dark / light theme**
- Responsive, keyboard accessible, and respects `prefers-reduced-motion`
- Only one dependency (Express). No build step. No database.

## 3. Screenshots

> Replace these placeholders with your own screenshots (`docs/` folder).

| Hero | Playground + visualization |
|---|---|
| ![Hero](docs/screenshot-hero.png) | ![Playground](docs/screenshot-playground.png) |

| Benchmark dashboard | Analysis |
|---|---|
| ![Dashboard](docs/screenshot-dashboard.png) | ![Analysis](docs/screenshot-analysis.png) |

## 4. Algorithms

Every matrix is one flat `Float64Array` in row-major order: element `(i, j)` is stored at index `i * n + j`. All four methods call the **same kernel** (`computeCell` in `src/matrix.js`). Only the way the work is split between threads changes, which is why the outputs are identical.

```
C[i][j] = Σ (k = 0 … n-1)  A[i][k] × B[k][j]
```

| # | Method | Threads | Work per thread | Limit |
|---|---|---|---|---|
| 1 | **Single-threaded**: classic `i → j → k` triple loop | 1 | n³ | n ≤ 512 |
| 2 | **Thread per row**: thread *i* computes row *i* of C | n | n² | n ≤ 300 |
| 3 | **Thread per cell**: thread *(i, j)* computes one cell | n² | n | n ≤ 12 |
| 4 | **Thread pool**: rows split into *p* blocks, *p* = CPU cores | p | n³ / p | n ≤ 512 |

**How a thread is timed** (`src/benchmark.js`):

1. `new Worker(...)` for every thread, then wait until each one posts `'ready'` → **creation time**
2. post `'start'` to all of them, then wait until each one posts `'done'` → **computation time**

Workers get the three `SharedArrayBuffer`s through `workerData`, so A, B and C are **never copied**. Each worker writes only its own rows or cells of C, so no locks are needed.

**Why the limits?** Each Node worker is a full V8 instance (several MB of RAM, tens of ms to start). On the server, at most `MAX_LIVE_WORKERS` (default 16) threads are alive at once, and the rest run in waves. Every row or cell still gets its own thread, but a 512 MB Render instance can't run out of memory. The browser allows 64 live workers.

## 5. Complexity analysis

| Method | Total work | Ideal time on p cores | Extra space |
|---|---|---|---|
| Single | O(n³) | O(n³) | O(1) |
| Per row | O(n³) | O(n³/p) + n·t꜀ | O(n) thread stacks |
| Per cell | O(n³) | O(n³/p) + n²·t꜀ | O(n²) thread stacks |
| Pool | O(n³) | O(n³/p) + p·t꜀ | O(p) thread stacks |

- **Time**: every method performs exactly n³ multiply-adds, so they are all **O(n³)**. Threads don't reduce the work, they only spread it over cores.
- **Space**: O(n²) for A, B and C (shared, not copied) plus one stack and JS engine per live thread.
- **t꜀** = the cost of creating one thread. This is what decides the winner in practice.
- **Amdahl's Law**: `S(p) = 1 / ((1 − f) + f/p)`, where *f* is the parallel fraction. Thread creation and messaging act like serial work. For small n they take up most of the time, so *f* is small and threads don't help.

## 6. Sample results

Measured on the server API, 4-core Intel Xeon @ 2.8 GHz, Node 22, 3 runs each (avg total ms = creation + compute):

| n | Single | Per row | Per cell | Pool (4 threads) | Fastest | Pool speedup |
|---:|---:|---:|---:|---:|---|---:|
| 10 | 0.16 | 210.6 | 1,587.1 | 69.2 | Single | 0.002× |
| 100 | 1.69 | 1,516.4 | — | 64.2 | Single | 0.03× |
| 200 | 16.08 | 3,158.3 | — | 71.6 | Single | 0.22× |
| 300 | 55.20 | 4,602.6 | — | 78.3 | Single | 0.71× |
| 500 | 260.58 | — | — | **157.3** | **Pool** | **1.66×** |

Thread creation vs computation (same run):

| n | Method | Creation ms | Compute ms | Overhead |
|---:|---|---:|---:|---:|
| 10 | Per cell (100 threads) | 1,534.6 | 52.5 | 97 % |
| 300 | Per row (300 threads) | 4,091.2 | 511.3 | 89 % |
| 500 | Pool (4 threads) | 64.1 | 93.2 | 41 % |

*All results were ✓ identical to the single-threaded output.* Your numbers will differ. Run the dashboard and press **Export CSV** to get your own.

### Conclusions

1. **Thread per cell is always the slowest.** At n = 10 it starts 100 threads that each do only 10 multiplications, so about 97 % of the time is thread creation. Too many threads make things slower.
2. **Thread per row** gives each thread more work (n²), but 300 threads on 4 cores means 300 × t꜀ of start-up time and no extra parallelism beyond 4×.
3. **The thread pool is the right design.** Creating only p threads keeps the overhead fixed (about 60 ms here). Once n³/p of work is larger than that, it wins: **1.66× faster at n = 500**. Counting computation only, it reached 2.8× of a possible 4×.
4. **For small matrices, single-threaded wins.** The whole multiply finishes before one thread can even start.
5. Speedup is limited by the core count and the serial overhead (**Amdahl's Law**). On a 1-core server no method can beat single-threaded.

## 7. Project structure

```
server.js                    Express app: API, validation, job queue, COOP/COEP headers
src/matrix.js                matrix helpers + single-threaded multiply (shared kernel)
src/benchmark.js             runs methods, spawns workers, times creation vs compute
src/workers/rowWorker.js     thread per row
src/workers/cellWorker.js    thread per cell
src/workers/poolWorker.js    thread pool (block of rows)
src/workers/jobWorker.js     runs each API request off the main thread (server never freezes)
public/index.html            single-page UI
public/css/style.css         theme, glassmorphism, animations, responsive + print styles
public/js/app.js             UI logic, dashboard, analysis, CSV, report
public/js/visualizer.js      animated matrices + worker chips (n ≤ 8)
public/js/charts.js          hand-written SVG line and bar charts
public/js/browserWorker.js   Web Worker for "Run on my device"
public/js/browserBench.js    browser benchmark engine (same output as the API)
public/js/matrixCore.js      browser copy of the kernel (used by page and workers)
test/verify.js               correctness self-test (npm test)
render.yaml                  Render blueprint
```

## 8. API

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/system` | — | CPU cores, CPU model, Node version, platform, memory, limits |
| `POST /api/multiply` | `{ "size": 100, "method": "pool", "runs": 3 }` | avg/min/max ms, creation & compute ms, threads, `correct`, 5×5 `preview` |
| `POST /api/benchmark` | `{ "sizes": [50,100,200,300], "methods": ["single","row","cell","pool"], "runs": 3 }` | `{ cores, results: [...] }` with `speedup` per result |
| `GET /api/health` | — | `{ ok: true }` (Render health check) |

`method` ∈ `single | row | cell | pool`. Sizes are 2 to 512 (row ≤ 300, cell ≤ 12). `runs` is 1 to 5. Invalid input returns `400 { "error": "..." }`.

**Server safety**: every request runs inside its own worker thread (`jobWorker.js`), so the Express event loop never blocks. Jobs run one at a time from a queue of up to 5 (more → `429`), and a job is killed after 120 s (→ `503`).

```bash
curl -X POST http://localhost:3000/api/multiply -H "Content-Type: application/json" -d '{"size":200,"method":"pool"}'
```

## 9. Run locally

Requires **Node.js 18 or newer**.

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
npm start          # → http://localhost:3000
npm test           # optional correctness check
```

## 10. Deploy on Render (free)

1. **Push to GitHub**: commit this folder and push it to a GitHub repository.
2. Open **https://dashboard.render.com** → **New +** → **Web Service**.
3. **Connect** your GitHub account and pick the repository.
4. Fill in:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Click **Create Web Service**. After a minute or two the app is live at `https://<name>.onrender.com`.

*Alternative:* **New +** → **Blueprint** → choose the repo. Render reads `render.yaml` and fills in everything for you.

No config changes are needed. The server listens on `process.env.PORT`, and `package.json` declares `"engines": { "node": ">=18" }`.

**Optional environment variables**

| Variable | Default | Meaning |
|---|---|---|
| `MAX_LIVE_WORKERS` | 16 | Max worker threads alive at once on the server |
| `JOB_TIMEOUT_MS` | 120000 | Kill a benchmark job after this long |

### Important: Render's free tier and multithreading

The free instance gets a small share of **one** CPU. With one core, threads can only take turns, so on the server:

- thread per row / per cell are **much** slower (pure overhead),
- the thread pool uses 1 worker and is slightly slower than single-threaded.

This is the expected result, not a bug, and it shows Amdahl's Law nicely. The app shows the core count, and the **"My device"** mode runs the same benchmark on your laptop's cores with Web Workers, where the pool shows a real speedup. Free services also sleep after 15 minutes idle, so the first request can take about 30–60 s.

> **Why the COOP/COEP headers?** Browsers only allow `SharedArrayBuffer` on *cross-origin isolated* pages. `server.js` sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. If a browser still blocks it, the device mode falls back to copying matrices with `postMessage`, and the UI shows "copy mode".

## 11. Viva quick reference

- **Why not one thread per cell?** Each thread does only n operations but costs a full thread start-up.
- **Why `SharedArrayBuffer`?** So threads share A, B and C without copying n² numbers to each thread.
- **Why no locks?** Every thread writes a different part of C, so there are no race conditions.
- **Why does the pool win?** It uses one thread per core (maximum real parallelism) and has the lowest overhead.
- **Complexity?** O(n³) work for all methods. O(n³/p) ideal time on p cores, plus thread overhead.

---

**Author:** Your Name (Roll No. XX) · Your College Name, Pune · DAA Lab, SPPU · [GitHub](https://github.com/your-username/your-repo)
