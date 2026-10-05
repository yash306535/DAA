'use strict';
/**
 * test/verify.js — quick self-check (run with `npm test`).
 * Multiplies a known 2×2 example by hand, then checks that every multithreaded
 * method produces exactly the same matrix as the single-threaded one.
 */
const assert = require('assert');
const M = require('../src/matrix');
const { runMethod } = require('../src/benchmark');

(async () => {
  // Hand-checked example: [1 2; 3 4] × [5 6; 7 8] = [19 22; 43 50]
  const A = Float64Array.from([1, 2, 3, 4]);
  const B = Float64Array.from([5, 6, 7, 8]);
  const C = M.multiplySingle(A, B, new Float64Array(4), 2);
  assert.deepStrictEqual(Array.from(C), [19, 22, 43, 50]);
  console.log('✓ 2×2 hand example');

  assert.deepStrictEqual(M.splitRows(10, 4), [[0, 3], [3, 6], [6, 8], [8, 10]]);
  console.log('✓ splitRows');

  for (const [method, n] of [['single', 37], ['row', 37], ['cell', 9], ['pool', 37]]) {
    const r = await runMethod(method, n, 1);
    assert.strictEqual(r.correct, true, `${method} gave a wrong result`);
    console.log(`✓ ${method.padEnd(6)} n=${n}  threads=${r.threads}  ${r.avgMs} ms`);
  }

  await assert.rejects(() => runMethod('cell', 13, 1), /supports sizes/);
  await assert.rejects(() => runMethod('row', 301, 1), /supports sizes/);
  console.log('✓ size limits enforced');
  console.log('All checks passed.');
})().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
