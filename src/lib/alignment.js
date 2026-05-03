// Word-level Needleman-Wunsch alignment over verse tokens. Used by tests
// and by the build-time fetcher; the runtime UI works off pre-computed
// variant data, but exposing this in the bundle lets us re-align ad hoc
// (e.g. when the user pastes in a custom riwāya).
import { normalizeRasm } from './arabic.js';

/**
 * @param {string[]} a tokens of riwaya A (Hafs reference)
 * @param {string[]} b tokens of riwaya B
 * @returns {Array<[string|null, string|null]>}
 */
export function alignWords(a, b) {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = min edit distance using rasm equality
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  const bt = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
  for (let i = 1; i <= n; i++) {
    dp[i][0] = i;
    bt[i][0] = 1; // up = delete
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j;
    bt[0][j] = 2; // left = insert
  }
  const rA = a.map(normalizeRasm);
  const rB = b.map(normalizeRasm);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = rA[i - 1] === rB[j - 1] ? 0 : 1;
      const diag = dp[i - 1][j - 1] + cost;
      const up = dp[i - 1][j] + 1;
      const left = dp[i][j - 1] + 1;
      let best = diag, dir = 0;
      if (up < best) { best = up; dir = 1; }
      if (left < best) { best = left; dir = 2; }
      dp[i][j] = best;
      bt[i][j] = dir;
    }
  }
  const out = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const dir = i === 0 ? 2 : j === 0 ? 1 : bt[i][j];
    if (dir === 0) out.push([a[--i], b[--j]]);
    else if (dir === 1) out.push([a[--i], null]);
    else out.push([null, b[--j]]);
  }
  return out.reverse();
}
