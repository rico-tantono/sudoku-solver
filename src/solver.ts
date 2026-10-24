export interface Step {
  /** Cell index, 0-80, row by row. */
  i: number;
  /** Digit placed, 1-9. */
  d: number;
  /** How many digits fitted this cell when it was chosen. */
  opts: number;
}

export type SolveResult =
  | { path: Step[]; error?: undefined }
  | { error: string; path?: undefined };

/** Index of the 3x3 box (0-8) that contains cell i. */
export const boxOf = (i: number): number =>
  Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);

const popcount = (m: number): number => {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
};

/**
 * Bitmask backtracking with "fewest candidates first".
 * Takes 81 numbers (0 = empty) and returns the final solution path.
 */
export function solve(g: number[]): SolveResult {
  const rows: number[] = Array(9).fill(0);
  const cols: number[] = Array(9).fill(0);
  const boxes: number[] = Array(9).fill(0);
  const empties: number[] = [];

  for (let i = 0; i < 81; i++) {
    if (g[i]) {
      const bit = 1 << (g[i] - 1);
      const r = Math.floor(i / 9), c = i % 9, b = boxOf(i);
      if ((rows[r] | cols[c] | boxes[b]) & bit) {
        return { error: 'Digit ' + g[i] + ' appears twice in the same row, column, or box.' };
      }
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
    } else {
      empties.push(i);
    }
  }

  const path: Step[] = [];

  function bt(n: number): boolean {
    if (n === empties.length) return true;

    let bi = -1, bm = 0, bc = 10;
    for (let k = n; k < empties.length; k++) {
      const i = empties[k];
      const used = rows[Math.floor(i / 9)] | cols[i % 9] | boxes[boxOf(i)];
      const av = ~used & 0x1ff;
      const cnt = popcount(av);
      if (cnt < bc) {
        bi = k; bm = av; bc = cnt;
        if (cnt <= 1) break;
      }
    }
    if (bc === 0) return false;

    [empties[n], empties[bi]] = [empties[bi], empties[n]];
    const i = empties[n], r = Math.floor(i / 9), c = i % 9, b = boxOf(i);

    let mask = bm;
    while (mask) {
      const bit = mask & -mask;
      mask ^= bit;
      const d = 31 - Math.clz32(bit) + 1;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      path.push({ i, d, opts: bc });
      if (bt(n + 1)) return true;
      path.pop();
      rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
    }

    [empties[n], empties[bi]] = [empties[bi], empties[n]];
    return false;
  }

  return bt(0)
    ? { path }
    : { error: 'This puzzle has no solution. Check the digits you entered.' };
}
