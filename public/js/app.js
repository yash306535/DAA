/**
 * app.js — wires the page together.
 *
 *   1. theme toggle, sticky nav, scroll-reveal, animated counters, hero rain
 *   2. system info (server via GET /api/system, browser via navigator)
 *   3. playground   (POST /api/multiply or BrowserBench.runMethod + Visualizer)
 *   4. dashboard    (POST /api/benchmark or BrowserBench.runBenchmark + charts + table)
 *   5. analysis     (insights written from the measured numbers)
 *   6. export CSV and print-friendly report
 */
(function () {
  'use strict';

  /* ================================================================ helpers */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => motionQuery.matches;

  const METHOD_ORDER = ['single', 'row', 'cell', 'pool'];
  const METHODS = BrowserBench.METHODS; // same limits as the server
  const SHORT = { single: 'Single', row: 'Per row', cell: 'Per cell', pool: 'Pool' };

  const state = {
    system: null, // GET /api/system response
    bench: null, // { target, cores, runs, results, date }
    sort: { key: 'size', dir: 1 },
    lastViz: null, // { method, n, cores } for the Replay button
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function fmtMs(v) {
    if (v == null || Number.isNaN(v)) return '–';
    if (v < 1) return v.toFixed(3);
    if (v < 100) return v.toFixed(2);
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  function fmtX(v) {
    if (v == null || !isFinite(v)) return '–';
    if (v >= 1000) return Math.round(v).toLocaleString() + '×';
    if (v >= 10) return v.toFixed(1) + '×';
    if (v >= 0.1) return v.toFixed(2) + '×';
    return v.toPrecision(2) + '×';
  }

  const seriesColor = (m) => getComputedStyle(document.documentElement).getPropertyValue('--s-' + m).trim();
  const targetName = (t) => (t === 'server' ? 'Server' : 'My device');

  async function api(url, body) {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error(`Server returned an invalid response (HTTP ${res.status})`);
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  /** Animate a number from 0 to `to` (instant when reduced motion is on). */
  function countUp(el, to, decimals, suffix) {
    decimals = decimals || 0;
    suffix = suffix || '';
    const format = (v) => v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduceMotion() || !isFinite(to)) {
      el.textContent = isFinite(to) ? format(to) : '–';
      return;
    }
    const start = performance.now();
    const dur = 1100;
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(to * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ================================================================ theme */
  const themeBtn = $('#themeToggle');
  function applyThemeLabel() {
    const t = document.documentElement.getAttribute('data-theme');
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#070b16' : '#f4f6fb');
  }
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {
      /* storage blocked — theme still changes for this visit */
    }
    applyThemeLabel();
    if (state.bench) renderCharts(); // charts read colours from CSS variables
  });
  applyThemeLabel();

  /* ================================================================ nav */
  const menuBtn = $('#menuToggle');
  const navLinks = $('#navLinks');
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $$('a', navLinks).forEach((a) =>
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    })
  );

  if ('IntersectionObserver' in window) {
    // Highlight the nav link of the section currently on screen.
    const linkFor = {};
    $$('a', navLinks).forEach((a) => (linkFor[a.getAttribute('href').slice(1)] = a));
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || !linkFor[e.target.id]) return;
          $$('a', navLinks).forEach((a) => a.classList.remove('active'));
          linkFor[e.target.id].classList.add('active');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    $$('main section[id]').forEach((s) => spy.observe(s));

    // Fade/slide sections in as they scroll into view.
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            reveal.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    $$('.reveal').forEach((el) => reveal.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('visible'));
  }

  /* ================================================================ hero: matrix rain */
  (function matrixRain() {
    const canvas = $('#matrixRain');
    const ctx = canvas.getContext('2d');
    const glyphs = '0123456789×+=Σ';
    let cols = [];
    let size = 16;
    let w = 0;
    let h = 0;
    let visible = true;
    let last = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = w < 600 ? 13 : 16;
      cols = Array.from({ length: Math.ceil(w / size) }, () => Math.random() * -h);
      if (reduceMotion()) drawStatic();
    }

    function colour(i) {
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      const palette = light ? ['#0e7490', '#6d28d9', '#4d7c0f'] : ['#22d3ee', '#a78bfa', '#a3e635'];
      return palette[i % 3];
    }

    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${size}px JetBrains Mono, monospace`;
      for (let x = 0; x < cols.length; x++) {
        for (let y = 0; y < h / size; y++) {
          if (Math.random() > 0.08) continue;
          ctx.globalAlpha = 0.25 + Math.random() * 0.4;
          ctx.fillStyle = colour(x);
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x * size, y * size);
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || reduceMotion() || document.hidden || now - last < 55) return;
      last = now;
      // Fade the previous frame instead of clearing, which leaves the trails.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = `${size}px JetBrains Mono, monospace`;
      for (let i = 0; i < cols.length; i++) {
        const y = cols[i];
        ctx.fillStyle = colour(i);
        ctx.globalAlpha = 0.85;
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y);
        cols[i] = y > h + Math.random() * 400 ? Math.random() * -200 : y + size;
      }
      ctx.globalAlpha = 1;
    }

    window.addEventListener('resize', resize);
    motionQuery.addEventListener && motionQuery.addEventListener('change', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(canvas);
    }
    resize();
    requestAnimationFrame(frame);
  })();

  /* Theory diagram: thread-per-cell grid, every cell its own colour. */
  (function cellDiagram() {
    const g = $('#cellDiagram');
    if (!g) return;
    const n = 6;
    let html = '';
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const hue = Math.round(((i * n + j) * 360) / (n * n)) + 190;
        html += `<rect x="${20 + j * 34}" y="${8 + i * 22}" width="30" height="18" rx="4" style="fill:hsl(${hue} 85% 62% / .6)"><animate attributeName="opacity" values="1;.35;1" dur="${(1 + ((i + j) % 5) * 0.25).toFixed(2)}s" repeatCount="indefinite"/></rect>`;
      }
    }
    g.innerHTML = html;
    if (reduceMotion()) $$('animate', g).forEach((a) => a.remove());
  })();

  /* ================================================================ system info */
  function deviceInfo() {
    const ua = navigator.userAgent;
    const match =
      /(Edg|OPR|Firefox|Chrome|Version)\/([\d.]+)/.exec(ua) || [];
    const names = { Edg: 'Edge', OPR: 'Opera', Firefox: 'Firefox', Chrome: 'Chrome', Version: 'Safari' };
    const browser = match[1] ? `${names[match[1]]} ${match[2].split('.')[0]}` : 'Unknown';
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'Unknown';
    return { browser, platform };
  }

  function initDeviceCard() {
    const info = deviceInfo();
    countUp($('#devCores'), BrowserBench.CORES);
    $('#devBrowser').textContent = info.browser;
    $('#devPlatform').textContent = info.platform;
    $('#devShared').textContent = BrowserBench.SHARED ? 'enabled (zero-copy)' : 'unavailable (copy mode)';
    $('#devLive').textContent = BrowserBench.MAX_LIVE;
  }

  async function initServerCard() {
    try {
      const s = await api('/api/system');
      state.system = s;
      countUp($('#srvCores'), s.cores);
      $('#srvNode').textContent = s.nodeVersion;
      $('#srvPlatform').textContent = s.platform;
      $('#srvCpu').textContent = s.cpuModel;
      $('#srvMem').textContent = `${(s.freeMemoryMB / 1024).toFixed(1)} / ${(s.totalMemoryMB / 1024).toFixed(1)} GB free`;
      $('#srvLive').textContent = s.maxLiveWorkers;
      $('#srvStatus').textContent =
        s.cores <= 1
          ? 'Only 1 core here. Server-side threads cannot run in parallel, so expect no speedup. Try "My device".'
          : `Online. Up to ${s.cores}× speedup is possible in theory.`;
      updatePlayground();
    } catch (err) {
      $('#srvStatus').textContent = 'Could not reach the server: ' + err.message + '. You can still run everything on "My device".';
    }
  }

  const coresFor = (target) => (target === 'server' ? (state.system ? state.system.cores : 1) : BrowserBench.CORES);

  /* ================================================================ playground */
  const playMethod = $('#playMethod');
  const playSize = $('#playSize');
  const playRuns = $('#playRuns');
  const playWarn = $('#playWarn');
  const playBtn = $('#playRun');
  const playTarget = () => $('input[name="playTarget"]:checked').value;

  function updatePlayground() {
    const method = playMethod.value;
    const max = METHODS[method].maxSize;
    playSize.max = max;
    if (+playSize.value > max) playSize.value = max;
    const n = +playSize.value;
    $('#playMaxLabel').textContent = max;
    $('#playSizeOut').textContent = `${n} × ${n}`;

    const cores = coresFor(playTarget());
    const notes = {
      single: 'One thread runs the classic i → j → k triple loop.',
      row: `Creates ${n} threads (one per row). Limited to n ≤ 300 because thread creation overhead and memory grow with every thread, so hundreds of threads cost more than they help.`,
      cell: `Creates ${n * n} threads (one per cell). Limited to n ≤ 12 (144 threads). Each thread does only ${n} multiplications, so this mainly shows that too many threads make things slower.`,
      pool: `Creates ${Math.min(cores, n)} thread${Math.min(cores, n) > 1 ? 's' : ''}, one per CPU core on ${targetName(playTarget()).toLowerCase()}, each computing a block of rows.`,
    };
    playWarn.textContent = notes[method] + (n > 8 ? ' Visualization is only shown for n ≤ 8.' : '');
  }

  playMethod.addEventListener('change', updatePlayground);
  playSize.addEventListener('input', updatePlayground);
  $$('input[name="playTarget"]').forEach((r) => r.addEventListener('change', updatePlayground));

  function setBadge(el, kind, text) {
    el.className = 'badge badge-' + kind;
    el.textContent = text;
  }

  function renderPlayResult(r, target) {
    countUp($('#rAvg'), r.avgMs, r.avgMs < 1 ? 3 : 2);
    $('#rMinMax').textContent = `${fmtMs(r.minMs)} / ${fmtMs(r.maxMs)}`;
    countUp($('#rThreads'), r.threads);
    $('#rWhere').textContent = targetName(target);
    $('#rCreate').textContent = fmtMs(r.creationMs);
    $('#rCompute').textContent = fmtMs(r.computeMs);
    const total = r.creationMs + r.computeMs || 1;
    const createPct = (r.creationMs / total) * 100;
    $('#rCreateBar').style.width = createPct + '%';
    $('#rComputeBar').style.width = 100 - createPct + '%';
    $('#rSplitText').textContent = `${createPct.toFixed(0)}% overhead`;
    setBadge($('#playBadge'), r.correct ? 'ok' : 'bad', r.correct ? '✓ Matches single-threaded' : '✗ Result mismatch');

    const k = r.preview.length;
    const grid = $('#rPreview');
    grid.style.setProperty('--k', k);
    grid.innerHTML = r.preview
      .flat()
      .map((v, i) => `<span style="animation-delay:${i * 18}ms">${v}</span>`)
      .join('');
  }

  $('#playForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const method = playMethod.value;
    const size = +playSize.value;
    const runs = +playRuns.value;
    const target = playTarget();

    playBtn.disabled = true;
    playBtn.classList.add('loading');
    setBadge($('#playBadge'), 'run', 'Running…');
    try {
      const r = target === 'server'
        ? await api('/api/multiply', { method, size, runs })
        : await BrowserBench.runMethod(method, size, runs);
      renderPlayResult(r, target);
      if (size <= 8) {
        state.lastViz = { method, n: size, cores: coresFor(target) };
        Visualizer.play($('#viz'), state.lastViz);
      }
    } catch (err) {
      setBadge($('#playBadge'), 'bad', 'Error');
      playWarn.textContent = err.message;
    } finally {
      playBtn.disabled = false;
      playBtn.classList.remove('loading');
    }
  });

  $('#vizReplay').addEventListener('click', () => {
    const n = +playSize.value;
    if (n > 8) {
      $('#viz').innerHTML = '<p class="viz-empty">The visualization is available for n ≤ 8. Move the size slider down to try it.</p>';
      return;
    }
    state.lastViz = { method: playMethod.value, n, cores: coresFor(playTarget()) };
    Visualizer.play($('#viz'), state.lastViz);
  });

  /* ================================================================ dashboard */
  const benchBtn = $('#benchRun');
  const benchErr = $('#benchError');
  const benchTarget = () => $('input[name="benchTarget"]:checked').value;

  function setProgress(fraction, label) {
    const pct = Math.round(fraction * 100);
    $('#benchBar span').style.width = pct + '%';
    $('#benchBar').setAttribute('aria-valuenow', pct);
    $('#benchPct').textContent = pct + '%';
    $('#benchStep').textContent = label;
  }

  function chartsLoading(on) {
    ['#lineChart', '#barChart'].forEach((sel) => {
      const box = $(sel);
      if (on) {
        box.innerHTML = '<div class="skeleton-chart" aria-hidden="true"></div><p class="chart-empty">Running…</p>';
        box.classList.add('loading');
      } else {
        box.classList.remove('loading');
      }
    });
  }

  /** Add speedup (total) and computeSpeedup (computation only) vs single at the same size. */
  function addSpeedups(results) {
    results.forEach((r) => {
      if (r.skipped) return;
      const base = results.find((x) => x.size === r.size && x.method === 'single' && !x.skipped);
      // Guard against a 0 ms reading (browser timers are rounded to a few microseconds).
      r.speedup = base && r.avgMs > 0 && base.avgMs > 0 ? base.avgMs / r.avgMs : null;
      r.computeSpeedup = base && r.computeMs > 0 ? base.computeMs / r.computeMs : null;
    });
    return results;
  }

  async function runDashboard() {
    const sizes = $$('#benchSizes input:checked').map((i) => +i.value).sort((a, b) => a - b);
    const methods = $$('#benchMethods input:checked').map((i) => i.value);
    const runs = +$('#benchRuns').value;
    const target = benchTarget();
    benchErr.hidden = true;
    if (!sizes.length) {
      benchErr.textContent = 'Pick at least one matrix size.';
      benchErr.hidden = false;
      return;
    }

    benchBtn.disabled = true;
    benchBtn.classList.add('loading');
    $('#exportCsv').disabled = true;
    $('#printReport').disabled = true;
    $('#benchProgress').hidden = false;
    chartsLoading(true);
    setProgress(0, 'Starting…');

    let results = [];
    let cores = coresFor(target);
    const errors = [];
    try {
      if (target === 'server') {
        // One request per size, so the progress bar moves and no single request gets too big.
        for (let i = 0; i < sizes.length; i++) {
          const n = sizes[i];
          setProgress(i / sizes.length, `Server · n = ${n} · all methods (${i + 1}/${sizes.length})`);
          try {
            const res = await api('/api/benchmark', { sizes: [n], methods, runs });
            cores = res.cores;
            results = results.concat(res.results);
          } catch (err) {
            errors.push(`n = ${n}: ${err.message}`);
            ['single'].concat(methods.filter((m) => m !== 'single')).forEach((m) =>
              results.push({ method: m, label: METHODS[m].label, size: n, skipped: true, reason: 'Error: ' + err.message })
            );
          }
        }
        setProgress(1, 'Done');
      } else {
        const res = await BrowserBench.runBenchmark(
          { sizes, methods: ['single'].concat(methods.filter((m) => m !== 'single')), runs },
          (done, total, label) => setProgress(done / total, `My device · ${label}`)
        );
        results = res.results;
        cores = res.cores;
      }

      state.bench = { target, cores, runs, results: addSpeedups(results), date: new Date() };
      renderDashboard();
      if (errors.length) {
        benchErr.textContent = 'Some sizes failed: ' + errors.join(' · ');
        benchErr.hidden = false;
      }
    } catch (err) {
      benchErr.textContent = 'Benchmark failed: ' + err.message;
      benchErr.hidden = false;
      chartsLoading(false);
    } finally {
      benchBtn.disabled = false;
      benchBtn.classList.remove('loading');
      setTimeout(() => ($('#benchProgress').hidden = true), 1200);
    }
  }

  benchBtn.addEventListener('click', runDashboard);
  $('#heroStart').addEventListener('click', () => {
    if (!state.bench && !benchBtn.disabled) setTimeout(runDashboard, reduceMotion() ? 0 : 600);
  });

  function renderDashboard() {
    chartsLoading(false);
    renderCharts();
    renderTable();
    renderAnalysis();
    $('#exportCsv').disabled = false;
    $('#printReport').disabled = false;
  }

  /* ---------------------------------------------------------------- charts */
  function chartSeries(valueKey, methods) {
    const ok = state.bench.results.filter((r) => !r.skipped);
    return methods
      .filter((m) => ok.some((r) => r.method === m))
      .map((m) => {
        const values = {};
        ok.filter((r) => r.method === m).forEach((r) => (values[r.size] = r[valueKey]));
        return { key: m, name: METHODS[m].label, color: seriesColor(m), values };
      });
  }

  function renderCharts() {
    if (!state.bench) return;
    const sizes = [...new Set(state.bench.results.map((r) => r.size))].sort((a, b) => a - b);
    const timeSeries = chartSeries('avgMs', METHOD_ORDER);
    Charts.legend($('#lineLegend'), timeSeries);
    Charts.line($('#lineChart'), {
      series: timeSeries,
      sizes,
      yLabel: 'Average time (ms)',
      logY: $('input[name="yscale"]:checked').value === 'log',
    });
    const speedSeries = chartSeries('speedup', ['row', 'cell', 'pool']);
    Charts.legend($('#barLegend'), speedSeries);
    if (speedSeries.length) {
      Charts.bars($('#barChart'), { series: speedSeries, sizes, yLabel: 'Speedup (×, log scale)' });
    } else {
      $('#barChart').innerHTML = '<p class="chart-empty">Select at least one multithreaded method.</p>';
    }
  }
  $$('input[name="yscale"]').forEach((r) => r.addEventListener('change', renderCharts));

  /* ---------------------------------------------------------------- table */
  function fastestBySize(results) {
    const best = {};
    results.forEach((r) => {
      if (r.skipped) return;
      if (!best[r.size] || r.avgMs < best[r.size].avgMs) best[r.size] = r;
    });
    return best;
  }

  function renderTable() {
    const { results, target, cores, runs } = state.bench;
    const best = fastestBySize(results);
    const { key, dir } = state.sort;
    const rows = results.slice().sort((a, b) => {
      // Skipped rows always go to the bottom when sorting by a measured value.
      if (a.skipped !== b.skipped && !['size', 'label'].includes(key)) return a.skipped ? 1 : -1;
      let va = a[key];
      let vb = b[key];
      if (key === 'label') {
        va = METHOD_ORDER.indexOf(a.method);
        vb = METHOD_ORDER.indexOf(b.method);
      }
      if (va === vb) return a.size - b.size || METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va > vb ? 1 : -1) * dir;
    });

    $('#resultsBody').innerHTML = rows
      .map((r) => {
        const method = `<span class="method-cell"><i class="sw" style="--c:var(--s-${r.method})"></i>${esc(r.label)}${!r.skipped && best[r.size] === r ? ' <span class="trophy">FASTEST</span>' : ''}</span>`;
        if (r.skipped) {
          return `<tr class="skipped"><td class="num">${r.size}</td><td>${method}</td><td colspan="8">Skipped: ${esc(r.reason)}</td></tr>`;
        }
        return `<tr class="${best[r.size] === r ? 'fastest' : ''}">
          <td class="num">${r.size}</td><td>${method}</td>
          <td class="num">${r.threads}</td>
          <td class="num"><b>${fmtMs(r.avgMs)}</b></td>
          <td class="num">${fmtMs(r.minMs)}</td>
          <td class="num">${fmtMs(r.maxMs)}</td>
          <td class="num">${fmtMs(r.creationMs)}</td>
          <td class="num">${fmtMs(r.computeMs)}</td>
          <td class="num">${fmtX(r.speedup)}</td>
          <td>${r.correct ? '<span class="ok" aria-label="correct">✓</span>' : '<span class="bad" aria-label="incorrect">✗</span>'}</td>
        </tr>`;
      })
      .join('');
    setBadge($('#tableMeta'), 'idle', `${targetName(target)} · ${cores} core${cores > 1 ? 's' : ''} · ${runs} run${runs > 1 ? 's' : ''}`);
  }

  $$('#resultsTable th button').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
      $$('#resultsTable th').forEach((th) => th.removeAttribute('aria-sort'));
      btn.parentElement.setAttribute('aria-sort', state.sort.dir === 1 ? 'ascending' : 'descending');
      if (state.bench) renderTable();
    })
  );

  /* ================================================================ analysis */
  function generateInsights(bench) {
    const ok = bench.results.filter((r) => !r.skipped);
    const get = (m, n) => ok.find((r) => r.method === m && r.size === n);
    const sizesOf = (m) => ok.filter((r) => r.method === m).map((r) => r.size).sort((a, b) => a - b);
    const where = targetName(bench.target);
    const p = bench.cores;
    const out = [];
    const k = (s) => `<span class="k">${s}</span>`;
    const slowerFaster = (ratio) => !isFinite(ratio) || ratio <= 0 ? `${k('much')} slower` : (ratio >= 1 ? `${k(fmtX(ratio))} faster` : `${k(fmtX(1 / ratio))} slower`);

    // 1. Context: how many cores we had.
    out.push({
      icon: '🖥',
      html: `Ran on ${k(where)} with ${k(p)} logical core${p > 1 ? 's' : ''}. ` +
        (p <= 1
          ? 'With one core, threads can only take turns, so no method can beat single-threaded. Extra threads only add overhead.'
          : `No method can go faster than ${k(p + '×')} here, because that is how many threads can truly run at the same time.`),
    });

    // 2. Fastest method per size.
    const best = fastestBySize(bench.results);
    const bestList = Object.keys(best).sort((a, b) => a - b).map((n) => `n = ${n} → ${SHORT[best[n].method]}`);
    if (bestList.length) out.push({ icon: '🏆', html: `Fastest method for each size: ${k(bestList.join(' · '))}.` });

    // 3. Thread per cell: creation cost vs computation.
    const cellSizes = sizesOf('cell');
    if (cellSizes.length) {
      const n = cellSizes[cellSizes.length - 1];
      const c = get('cell', n);
      const s = get('single', n);
      const share = (c.creationMs / (c.creationMs + c.computeMs)) * 100;
      out.push({
        icon: '🧵',
        html: `Thread per cell was ${slowerFaster(s.avgMs / c.avgMs)} than single-threaded at ${k('n = ' + n)}. It created ${k(c.threads)} threads and spent ${k(fmtMs(c.creationMs) + ' ms')} creating them, but only ${k(fmtMs(c.computeMs) + ' ms')} computing. Each thread did just ${n} multiplications, so thread creation cost far exceeded computation cost (${share.toFixed(0)}% of the time was overhead).`,
      });
    }

    // 4. Thread per row at its largest size.
    const rowSizes = sizesOf('row');
    if (rowSizes.length) {
      const n = rowSizes[rowSizes.length - 1];
      const r = get('row', n);
      const s = get('single', n);
      const share = (r.creationMs / (r.creationMs + r.computeMs)) * 100;
      out.push({
        icon: '📏',
        html: `Thread per row at ${k('n = ' + n)} used ${k(r.threads)} threads on ${p} core${p > 1 ? 's' : ''} and was ${slowerFaster(s.avgMs / r.avgMs)} than single-threaded. ${share.toFixed(0)}% of its ${fmtMs(r.avgMs)} ms went into creating threads. Having more threads than cores adds start-up cost without adding any parallelism.`,
      });
    }

    // 5. Thread pool: best speedup and compute-only speedup.
    const poolSizes = sizesOf('pool');
    let amdahlS = null;
    let amdahlP = null;
    if (poolSizes.length) {
      const pools = poolSizes.map((n) => get('pool', n));
      const top = pools.reduce((a, b) => (b.speedup > a.speedup ? b : a));
      const n = poolSizes[poolSizes.length - 1];
      const last = get('pool', n);
      const theo = Math.min(last.threads, p);
      out.push({
        icon: '⚡',
        html: `The thread pool's best total speedup was ${k(fmtX(top.speedup))} at ${k('n = ' + top.size)} using ${top.threads} thread${top.threads > 1 ? 's' : ''}. ` +
          (last.computeSpeedup
            ? `Counting computation only, it ran ${k(fmtX(last.computeSpeedup))} at n = ${n}, against a theoretical ${k(theo + '×')} (efficiency ${((last.computeSpeedup / theo) * 100).toFixed(0)}%).`
            : ''),
      });
      amdahlS = last.computeSpeedup;
      amdahlP = theo;

      // 6. Crossover point (or an estimate of where it would be).
      const win = pools.find((x) => x.speedup > 1);
      if (win) {
        out.push({ icon: '📈', html: `The pool first beats single-threaded at ${k('n = ' + win.size)}. From that size on, the n³ work is big enough to cover the cost of starting the threads.` });
      } else {
        const s = get('single', n);
        const creation = pools.reduce((a, x) => a + x.creationMs, 0) / pools.length;
        if (s && last.threads > 1 && s.computeMs > 0) {
          const c = s.computeMs / Math.pow(n, 3);
          const est = Math.cbrt(creation / (c * (1 - 1 / Math.min(last.threads, p))));
          out.push({
            icon: '📐',
            html: `The pool never beat single-threaded in this run, because starting its threads took about ${k(fmtMs(creation) + ' ms')} while the whole single-threaded multiply at n = ${n} took only ${fmtMs(s.avgMs)} ms. Using single ≈ c·n³ with these numbers, it should start winning at about ${k('n ≈ ' + Math.round(est))}${est > 512 ? ' (larger than this tool allows)' : '. Try adding size 500'}.`,
          });
        } else {
          out.push({ icon: '📐', html: `With only ${p} core the pool uses a single worker thread. It does the same work as single-threaded plus thread start-up, so it cannot win here. Run on "My device" to see real parallelism.` });
        }
      }
    }

    // 7. Amdahl's Law estimate from the pool's compute-only speedup.
    if (amdahlS && amdahlP > 1 && amdahlS > 1) {
      const f = Math.min(1, (1 - 1 / amdahlS) / (1 - 1 / amdahlP));
      const limit = f >= 0.999 ? 'practically unlimited (it is almost all parallel)' : fmtX(1 / (1 - f));
      out.push({
        icon: '🧮',
        html: `Amdahl's Law: a compute-only speedup of ${fmtX(amdahlS)} on ${amdahlP} threads means about ${k((f * 100).toFixed(1) + '%')} of the work ran in parallel. With unlimited cores the speedup would be capped at ${k(limit)}. The rest is spent on sending messages, waiting for the slowest thread, and memory bandwidth.`,
      });
    }

    // 8. O(n³) growth check using the two largest single-threaded sizes.
    const singleSizes = sizesOf('single');
    if (singleSizes.length >= 2) {
      const n2 = singleSizes[singleSizes.length - 1];
      const n1 = singleSizes[singleSizes.length - 2];
      const ratio = get('single', n2).avgMs / get('single', n1).avgMs;
      const theory = Math.pow(n2 / n1, 3);
      out.push({ icon: '📊', html: `O(n³) check: going from n = ${n1} to n = ${n2} made single-threaded ${k(fmtX(ratio))} slower. Cubic growth predicts (${n2}/${n1})³ = ${k(fmtX(theory))}. Small sizes are noisy because of timer resolution and CPU caches.` });
    }

    // 9. Correctness.
    const bad = ok.filter((r) => !r.correct);
    out.push(
      bad.length
        ? { icon: '✗', html: `${k(bad.length)} result(s) did not match single-threaded: ${bad.map((r) => `${SHORT[r.method]} @ n = ${r.size}`).join(', ')}.` }
        : { icon: '✓', html: `All ${k(ok.length)} results matched the single-threaded answer exactly, element by element. Splitting the work never changed the answer.` }
    );

    return out;
  }

  function renderAnalysis() {
    const insights = generateInsights(state.bench);
    state.insights = insights;
    $('#insights').innerHTML = insights
      .map((x, i) => `<li data-icon="${x.icon}" style="animation-delay:${i * 70}ms"><span>${x.html}</span></li>`)
      .join('');

    const p = state.bench.cores;
    const rows = state.bench.results
      .filter((r) => !r.skipped && r.method !== 'single')
      .sort((a, b) => a.size - b.size || METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method));
    $('#tvaBody').innerHTML = rows.length
      ? rows
          .map((r) => {
            const theo = Math.min(r.threads, p);
            return `<tr><td class="mono">${r.size}</td><td>${esc(r.label)}</td><td class="num">${theo}×</td><td class="num">${fmtX(r.speedup)}</td><td class="num">${fmtX(r.computeSpeedup)}</td><td class="num">${((r.speedup / theo) * 100).toFixed(1)}%</td></tr>`;
          })
          .join('')
      : '<tr class="empty-row"><td colspan="6">No multithreaded results in this run.</td></tr>';
  }

  /* ================================================================ export */
  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  $('#exportCsv').addEventListener('click', () => {
    if (!state.bench) return;
    const { target, cores, results } = state.bench;
    const header = ['target', 'cores', 'size', 'method', 'threads', 'runs', 'avg_ms', 'min_ms', 'max_ms', 'creation_ms', 'compute_ms', 'speedup', 'compute_speedup', 'correct', 'note'];
    const lines = [header.join(',')];
    results.forEach((r) => {
      lines.push(
        [
          targetName(target), cores, r.size, r.label, r.threads, r.runs, r.avgMs, r.minMs, r.maxMs, r.creationMs, r.computeMs,
          r.speedup != null ? r.speedup.toPrecision(4) : '', r.computeSpeedup != null ? r.computeSpeedup.toPrecision(4) : '',
          r.skipped ? '' : r.correct, r.skipped ? r.reason : '',
        ].map(csvCell).join(',')
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `matmul-benchmark-${target}-${state.bench.date.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ================================================================ report */
  const REPORT_CSS = `
    body{font-family:'Segoe UI',system-ui,sans-serif;color:#111;max-width:900px;margin:24px auto;padding:0 20px;line-height:1.5}
    h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
    .meta{color:#555;font-size:13px}table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}th{background:#f2f4f7}td.n{text-align:right;font-family:Consolas,monospace}
    tr.best td{background:#eef7e6}ul{padding-left:18px}li{margin-bottom:6px;font-size:13px}.k{font-weight:600;font-family:Consolas,monospace}
    .charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.chart svg{width:100%;height:auto}
    .grid{stroke:#e5e7eb}.baseline{stroke:#999}.tick{fill:#555;font:10px Consolas,monospace}.axis-label,.direct-label{fill:#333;font:11px sans-serif}
    .line{fill:none;stroke-width:2.5;stroke-dashoffset:0!important}.dot{stroke:#fff;stroke-width:2}.hit,.crosshair{display:none}.one-line{stroke:#666;stroke-dasharray:5 4}
    .legend span{display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:12px}.legend i{width:11px;height:11px;border-radius:2px;display:inline-block}
    .actions{margin:16px 0}button{font:600 14px sans-serif;padding:8px 16px;border-radius:8px;border:1px solid #888;background:#fff;cursor:pointer}
    @media print{.actions{display:none}body{margin:0}}`;

  $('#printReport').addEventListener('click', () => {
    if (!state.bench) return;
    const b = state.bench;
    const best = fastestBySize(b.results);
    const legend = (series) => `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
    const line = $('#lineChart svg');
    const bar = $('#barChart svg');
    const sys = state.system;
    const tableRows = b.results
      .slice()
      .sort((x, y) => x.size - y.size || METHOD_ORDER.indexOf(x.method) - METHOD_ORDER.indexOf(y.method))
      .map((r) =>
        r.skipped
          ? `<tr><td class="n">${r.size}</td><td>${esc(r.label)}</td><td colspan="8">Skipped: ${esc(r.reason)}</td></tr>`
          : `<tr class="${best[r.size] === r ? 'best' : ''}"><td class="n">${r.size}</td><td>${esc(r.label)}</td><td class="n">${r.threads}</td><td class="n">${fmtMs(r.avgMs)}</td><td class="n">${fmtMs(r.minMs)}</td><td class="n">${fmtMs(r.maxMs)}</td><td class="n">${fmtMs(r.creationMs)}</td><td class="n">${fmtMs(r.computeMs)}</td><td class="n">${fmtX(r.speedup)}</td><td>${r.correct ? '✓' : '✗'}</td></tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Matrix Multiplication Benchmark Report</title><style>${REPORT_CSS}</style></head><body>
      <h1>Matrix Multiplication: Single vs Multithreaded</h1>
      <div class="meta">DAA Mini Project 7 · Generated ${esc(b.date.toLocaleString())} · Ran on <b>${targetName(b.target)}</b> · ${b.cores} core(s) · ${b.runs} run(s) per test</div>
      <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
      <h2>Problem statement</h2>
      <p>Implement matrix multiplication, and multithreaded matrix multiplication with one thread per row and one thread per cell. Analyze and compare their performance. A thread-pool version (one thread per CPU core) is included as an optimized approach.</p>
      <h2>Environment</h2>
      <p>${b.target === 'server' && sys ? `Server: Node ${esc(sys.nodeVersion)}, ${esc(sys.platform)}, ${esc(sys.cpuModel)}, ${sys.cores} core(s).` : `Browser: ${esc(deviceInfo().browser)} on ${esc(deviceInfo().platform)}, ${BrowserBench.CORES} logical core(s), SharedArrayBuffer ${BrowserBench.SHARED ? 'enabled' : 'unavailable'}.`}</p>
      <h2>Charts</h2>
      <div class="charts"><div class="chart"><b>Execution time vs size (ms)</b>${legend(chartSeries('avgMs', METHOD_ORDER))}${line ? line.outerHTML : ''}</div>
      <div class="chart"><b>Speedup vs single-threaded</b>${legend(chartSeries('speedup', ['row', 'cell', 'pool']))}${bar ? bar.outerHTML : ''}</div></div>
      <h2>Results</h2>
      <table><thead><tr><th>n</th><th>Method</th><th>Threads</th><th>Avg ms</th><th>Min</th><th>Max</th><th>Creation</th><th>Compute</th><th>Speedup</th><th>OK</th></tr></thead><tbody>${tableRows}</tbody></table>
      <p class="meta">Highlighted rows = fastest method for that size. Creation = time to start the threads; Compute = time from "start" until every thread finished.</p>
      <h2>Analysis</h2><ul>${(state.insights || []).map((x) => `<li>${x.html}</li>`).join('')}</ul>
      <h2>Complexity</h2>
      <p>All methods perform n³ multiply-adds, so time complexity is O(n³). With p cores the ideal time is O(n³/p) plus T·t<sub>c</sub> thread-creation overhead (T = n for per-row, n² for per-cell, p for the pool). Space is O(n²) for A, B and C, shared between threads through a SharedArrayBuffer, plus one stack per thread.</p>
      <h2>Conclusion</h2>
      <p>Multithreading only helps when each thread has enough work to cover the cost of creating it, and when there are cores free to run the threads in parallel. Thread per cell is always slowest, because n² threads each do only n operations. Thread per row starts more threads than there are cores. A pool with one thread per core, each computing a block of rows, gives the best result for large n. By Amdahl's Law, the speedup is limited by the serial overhead and the number of cores.</p>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      window.print(); // pop-up blocked: print the page itself (print stylesheet hides the rest)
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  });

  /* ================================================================ init */
  initDeviceCard();
  initServerCard();
  updatePlayground();
})();
