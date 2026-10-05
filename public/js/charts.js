/**
 * charts.js — hand-written SVG charts (no chart library).
 *
 *   Charts.line(container, { series, sizes, yLabel, logY })
 *       execution time vs matrix size, one line per method
 *   Charts.bars(container, { series, sizes, yLabel })
 *       speedup vs single-threaded, grouped by size, on a log scale around 1×
 *
 * series = [{ key, name, color, values: { [size]: number } }]
 *
 * Sizes are spaced evenly on the x-axis (an ordinal axis) so small sizes are not
 * squashed together. Times span several orders of magnitude, so the y-axis is
 * logarithmic by default.
 */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = 640;
  const H = 380;
  const M = { top: 20, right: 112, bottom: 54, left: 70 };
  const PW = W - M.left - M.right;
  const PH = H - M.top - M.bottom;

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function fmt(v) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1000) return (v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'k';
    if (a >= 10) return Math.round(v).toLocaleString();
    if (a >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return v.toLocaleString(undefined, { maximumSignificantDigits: 2 });
  }

  /** y scale: linear or log10. Returns { y(v), ticks[] }. */
  function yScale(minV, maxV, log) {
    if (log) {
      const lo = Math.floor(Math.log10(minV));
      const hi = Math.max(lo + 1, Math.ceil(Math.log10(maxV)));
      const ticks = [];
      for (let p = lo; p <= hi; p++) ticks.push(Math.pow(10, p));
      return { y: (v) => M.top + PH - ((Math.log10(v) - lo) / (hi - lo)) * PH, ticks };
    }
    const max = niceMax(maxV);
    const ticks = [];
    for (let i = 0; i <= 5; i++) ticks.push((max / 5) * i);
    return { y: (v) => M.top + PH - (v / max) * PH, ticks };
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  /** Build the SVG + tooltip shell inside the container. */
  function shell(container, title) {
    container.innerHTML = '';
    container.classList.add('chart');
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': title, preserveAspectRatio: 'xMidYMid meet' }, container);
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.setAttribute('role', 'status');
    container.appendChild(tip);
    return { svg, tip };
  }

  function axes(svg, sizes, ys, yLabel, x, tickFmt) {
    const g = el('g', { class: 'axes' }, svg);
    ys.ticks.forEach((t) => {
      const yy = ys.y(t);
      el('line', { x1: M.left, x2: M.left + PW, y1: yy, y2: yy, class: 'grid' }, g);
      el('text', { x: M.left - 10, y: yy + 4, 'text-anchor': 'end', class: 'tick' }, g).textContent = tickFmt(t);
    });
    sizes.forEach((s) => {
      el('text', { x: x(s), y: M.top + PH + 22, 'text-anchor': 'middle', class: 'tick' }, g).textContent = s;
    });
    el('line', { x1: M.left, x2: M.left + PW, y1: M.top + PH, y2: M.top + PH, class: 'baseline' }, g);
    el('text', { x: M.left + PW / 2, y: H - 8, 'text-anchor': 'middle', class: 'axis-label' }, g).textContent = 'Matrix size n (n × n)';
    el('text', { x: 16, y: M.top + PH / 2, 'text-anchor': 'middle', class: 'axis-label', transform: `rotate(-90 16 ${M.top + PH / 2})` }, g).textContent = yLabel;
  }

  function showTip(container, tip, html, px, py) {
    tip.innerHTML = html;
    tip.classList.add('show');
    const box = container.getBoundingClientRect();
    const scale = box.width / W;
    let left = px * scale + 14;
    if (left + tip.offsetWidth > box.width) left = px * scale - tip.offsetWidth - 14;
    tip.style.left = Math.max(0, left) + 'px';
    tip.style.top = Math.max(0, py * scale - tip.offsetHeight / 2) + 'px';
  }

  function tipRow(color, name, value) {
    return `<div class="tip-row"><span class="swatch" style="background:${color}"></span><span>${name}</span><b>${value}</b></div>`;
  }

  /* ------------------------------------------------------------ line chart */
  function line(container, opts) {
    const { series, sizes, yLabel, logY = true, unit = 'ms' } = opts;
    const { svg, tip } = shell(container, 'Line chart: ' + yLabel + ' versus matrix size');
    const all = [];
    series.forEach((s) => sizes.forEach((n) => s.values[n] != null && all.push(s.values[n])));
    if (!all.length) return;
    const minPos = Math.max(1e-3, Math.min(...all.filter((v) => v > 0)));
    const ys = yScale(minPos, Math.max(...all), logY);
    const step = sizes.length > 1 ? PW / (sizes.length - 1) : 0;
    const x = (n) => M.left + (sizes.length > 1 ? sizes.indexOf(n) * step : PW / 2);
    axes(svg, sizes, ys, yLabel, x, fmt);

    const clampY = (v) => ys.y(Math.max(v, logY ? minPos : 0));
    const labels = [];
    series.forEach((s, si) => {
      const pts = sizes.filter((n) => s.values[n] != null).map((n) => [x(n), clampY(s.values[n])]);
      if (!pts.length) return;
      const g = el('g', { class: 'series' }, svg);
      if (pts.length > 1) {
        const path = el('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), stroke: s.color, class: 'line' }, g);
        const len = path.getTotalLength ? path.getTotalLength() : 1000;
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.style.animationDelay = si * 150 + 'ms';
        path.classList.add('draw');
      }
      pts.forEach((p, i) => {
        const c = el('circle', { cx: p[0], cy: p[1], r: 4.5, fill: s.color, class: 'dot' }, g);
        c.style.animationDelay = si * 150 + i * 60 + 300 + 'ms';
      });
      const last = pts[pts.length - 1];
      labels.push({ x: last[0], y: last[1], text: s.name, color: s.color });
    });

    // Direct labels at the end of each line, nudged apart so they never overlap.
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
    }
    labels.forEach((l) => {
      el('text', { x: l.x + 9, y: l.y + 4, class: 'direct-label' }, svg).textContent = l.text;
    });

    // Hover layer: a crosshair + tooltip per size column.
    const cross = el('line', { y1: M.top, y2: M.top + PH, class: 'crosshair' }, svg);
    sizes.forEach((n) => {
      const hit = el('rect', {
        x: x(n) - (step || PW) / 2, y: M.top, width: step || PW, height: PH,
        class: 'hit', tabindex: 0, 'aria-label': 'n = ' + n,
      }, svg);
      const show = () => {
        cross.setAttribute('x1', x(n));
        cross.setAttribute('x2', x(n));
        cross.classList.add('show');
        const rows = series
          .filter((s) => s.values[n] != null)
          .map((s) => tipRow(s.color, s.name, fmt(s.values[n]) + ' ' + unit))
          .join('');
        showTip(container, tip, `<div class="tip-title">n = ${n}</div>${rows || '<em>no data</em>'}`, x(n), M.top + PH / 3);
      };
      const hide = () => {
        cross.classList.remove('show');
        tip.classList.remove('show');
      };
      hit.addEventListener('mouseenter', show);
      hit.addEventListener('focus', show);
      hit.addEventListener('mouseleave', hide);
      hit.addEventListener('blur', hide);
    });
  }

  /* ------------------------------------------------------------- bar chart */
  function bars(container, opts) {
    const { series, sizes, yLabel } = opts;
    const { svg, tip } = shell(container, 'Bar chart: ' + yLabel);
    const all = [];
    series.forEach((s) => sizes.forEach((n) => s.values[n] > 0 && all.push(s.values[n])));
    if (!all.length) return;
    // Log scale that always contains 1× (the single-threaded baseline).
    const ys = yScale(Math.min(1, ...all), Math.max(1, ...all), true);
    const group = PW / sizes.length;
    const x = (n) => M.left + group * sizes.indexOf(n) + group / 2;
    axes(svg, sizes, ys, yLabel, x, (t) => fmt(t) + '×');

    const y1 = ys.y(1);
    el('line', { x1: M.left, x2: M.left + PW, y1, y2: y1, class: 'one-line' }, svg);
    el('text', { x: M.left + PW + 6, y: y1 + 4, class: 'direct-label' }, svg).textContent = '1× = single';

    const gap = 2;
    const barW = Math.min(28, (group * 0.8) / series.length - gap);
    sizes.forEach((n) => {
      const present = series.filter((s) => s.values[n] > 0);
      const totalW = present.length * (barW + gap) - gap;
      present.forEach((s, i) => {
        const v = s.values[n];
        const yv = ys.y(v);
        const bx = x(n) - totalW / 2 + i * (barW + gap);
        const up = v >= 1;
        const top = up ? yv : y1;
        const h = Math.max(2, Math.abs(yv - y1));
        const r = el('rect', {
          x: bx, y: top, width: barW, height: h, rx: 3, fill: s.color,
          class: 'bar ' + (up ? 'up' : 'down'), tabindex: 0,
          'aria-label': `${s.name}, n = ${n}: ${fmt(v)}× speedup`,
        }, svg);
        r.style.animationDelay = sizes.indexOf(n) * 90 + i * 40 + 'ms';
        const show = () => {
          const verdict = v >= 1 ? `${fmt(v)}× faster` : `${fmt(1 / v)}× slower`;
          showTip(container, tip, `<div class="tip-title">n = ${n}</div>${tipRow(s.color, s.name, fmt(v) + '×')}<div class="tip-note">${verdict} than single-threaded</div>`, bx + barW, up ? yv : yv - 10);
        };
        const hide = () => tip.classList.remove('show');
        r.addEventListener('mouseenter', show);
        r.addEventListener('focus', show);
        r.addEventListener('mouseleave', hide);
        r.addEventListener('blur', hide);
      });
    });
  }

  /** HTML legend (always shown for 2+ series). */
  function legend(container, series) {
    container.innerHTML = series
      .map((s) => `<span class="legend-item"><span class="swatch" style="background:${s.color}"></span>${s.name}</span>`)
      .join('');
  }

  root.Charts = { line, bars, legend, fmt };
})(window);
