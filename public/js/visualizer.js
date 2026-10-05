/**
 * visualizer.js — animated view of HOW each method splits the work (n ≤ 8).
 *
 * The real multiplication finishes in microseconds, far too fast to watch, so this
 * is a slowed-down replay of the same work split:
 *   single : 1 thread walks through every cell in order
 *   row    : n threads, thread i owns row i (each row has its own colour)
 *   cell   : n² threads, one per cell — all cells pulse at once, but look how
 *            long it takes to create all those threads first
 *   pool   : one thread per CPU core, each owns a block of rows
 *
 * The numbers are real: A and B use the same seeds as the benchmark, and every
 * C cell shows the actual dot product of row i of A and column j of B.
 */
(function (root) {
  'use strict';
  const MC = root.MatrixCore;
  const MAX_CHIPS = 48;
  let runId = 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reduceMotion = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Which cells each thread computes, in order. */
  function buildThreads(method, n, cores) {
    const threads = [];
    const color = (i, total) => `hsl(${Math.round((i * 360) / total) + 190} 85% 60%)`;
    if (method === 'single') {
      const cells = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push([i, j]);
      threads.push({ name: 'main', color: 'var(--cyan)', cells });
    } else if (method === 'row') {
      for (let i = 0; i < n; i++) {
        const cells = [];
        for (let j = 0; j < n; j++) cells.push([i, j]);
        threads.push({ name: 'row ' + i, color: color(i, n), cells });
      }
    } else if (method === 'cell') {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          threads.push({ name: `(${i},${j})`, color: color(i * n + j, n * n), cells: [[i, j]] });
        }
      }
    } else {
      const chunks = MC.splitRows(n, Math.min(cores, n));
      chunks.forEach(([s, e], t) => {
        const cells = [];
        for (let i = s; i < e; i++) for (let j = 0; j < n; j++) cells.push([i, j]);
        threads.push({ name: `core ${t} · rows ${s}–${e - 1}`, color: color(t, chunks.length), cells });
      });
    }
    return threads;
  }

  function grid(label, n, values) {
    const wrap = document.createElement('div');
    wrap.className = 'viz-matrix';
    wrap.innerHTML = `<div class="viz-label">${label}</div>`;
    const g = document.createElement('div');
    g.className = 'viz-grid';
    g.style.setProperty('--n', n);
    g.setAttribute('role', 'grid');
    g.setAttribute('aria-label', `Matrix ${label}, ${n} by ${n}`);
    const cells = [];
    for (let i = 0; i < n * n; i++) {
      const c = document.createElement('div');
      c.className = 'viz-cell';
      c.textContent = values ? values[i] : '·';
      g.appendChild(c);
      cells.push(c);
    }
    wrap.appendChild(g);
    return { wrap, cells };
  }

  function op(sym) {
    const s = document.createElement('div');
    s.className = 'viz-op';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = sym;
    return s;
  }

  /** Stop any animation that is still running. */
  function stop() {
    runId++;
  }

  async function play(container, opts) {
    const { method, n } = opts;
    const cores = opts.cores || 4;
    const token = ++runId;
    const alive = () => token === runId;

    const A = MC.fillRandom(new Float64Array(n * n), MC.SEED_A);
    const B = MC.fillRandom(new Float64Array(n * n), MC.SEED_B);
    const C = MC.multiplySingle(A, B, new Float64Array(n * n), n);

    container.innerHTML = '';
    const mats = document.createElement('div');
    mats.className = 'viz-matrices';
    const gA = grid('A', n, A);
    const gB = grid('B', n, B);
    const gC = grid('C = A × B', n, null);
    mats.append(gA.wrap, op('×'), gB.wrap, op('='), gC.wrap);

    const lane = document.createElement('div');
    lane.className = 'viz-threads';
    lane.innerHTML = '<div class="viz-threads-head"><span>Worker threads</span><span class="mono"><b class="live">0</b> alive</span></div><div class="chips" aria-live="off"></div>';
    const chipsEl = lane.querySelector('.chips');
    const liveEl = lane.querySelector('.live');

    const status = document.createElement('p');
    status.className = 'viz-status';
    status.setAttribute('aria-live', 'polite');
    container.append(mats, lane, status);

    const threads = buildThreads(method, n, cores);
    const instant = reduceMotion();

    // ---- Phase 1: thread creation (chips appear one by one) ----
    status.textContent = `Creating ${threads.length} thread${threads.length > 1 ? 's' : ''}…`;
    const spawnDelay = instant ? 0 : clamp(1400 / threads.length, 18, 240);
    const chips = [];
    let more = null;
    for (let t = 0; t < threads.length; t++) {
      if (!alive()) return;
      if (t < MAX_CHIPS) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.setProperty('--tc', threads[t].color);
        chip.textContent = threads[t].name;
        chipsEl.appendChild(chip);
        chips.push(chip);
      } else {
        if (!more) {
          more = document.createElement('span');
          more.className = 'chip more';
          chipsEl.appendChild(more);
        }
        more.textContent = `+${t - MAX_CHIPS + 1} more`;
      }
      liveEl.textContent = t + 1;
      if (spawnDelay) await sleep(spawnDelay);
    }

    // ---- Phase 2: computation (every thread advances one cell per tick) ----
    const steps = Math.max(...threads.map((t) => t.cells.length));
    const tick = instant ? 0 : clamp(2800 / steps, 80, 650);
    status.textContent =
      method === 'single'
        ? 'One thread computes every cell, one after another.'
        : method === 'cell'
          ? `All ${threads.length} cells are computed at the same moment — but creating ${threads.length} threads took far longer than the math.`
          : `${threads.length} threads compute in parallel — each one only touches its own part of C.`;
    let lit = [];
    for (let s = 0; s < steps; s++) {
      if (!alive()) return;
      lit.forEach((c) => c.classList.remove('hl'));
      lit = [];
      threads.forEach((th, t) => {
        const cell = th.cells[s];
        if (chips[t]) chips[t].classList.toggle('working', !!cell);
        if (!cell) return;
        const [i, j] = cell;
        for (let k = 0; k < n; k++) {
          const a = gA.cells[i * n + k];
          const b = gB.cells[k * n + j];
          a.style.setProperty('--tc', th.color);
          b.style.setProperty('--tc', th.color);
          lit.push(a, b);
        }
        const c = gC.cells[i * n + j];
        c.textContent = C[i * n + j];
        c.style.setProperty('--tc', th.color);
        c.classList.add('done');
        if (!instant) {
          c.classList.remove('pulse');
          void c.offsetWidth; // restart the CSS animation
          c.classList.add('pulse');
        }
      });
      if (!instant) {
        lit.forEach((c) => c.classList.add('hl'));
        await sleep(tick);
      }
    }
    lit.forEach((c) => c.classList.remove('hl'));

    // ---- Phase 3: threads finish and exit ----
    chips.forEach((c) => {
      c.classList.remove('working');
      c.classList.add('exit');
    });
    if (more) more.classList.add('exit');
    if (!instant) await sleep(500);
    if (!alive()) return;
    liveEl.textContent = 0;
    status.textContent = `Done — C computed by ${threads.length} thread${threads.length > 1 ? 's' : ''}. Every value matches the single-threaded result.`;
  }

  root.Visualizer = { play, stop };
})(window);
