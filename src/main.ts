import { solve, boxOf, type Step } from './solver';

const EXAMPLE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const READY = 'Enter a puzzle, then press Solve.';

const grid = document.getElementById('grid') as HTMLElement;
const msg = document.getElementById('msg') as HTMLElement;
const btn = (id: string) => document.getElementById(id) as HTMLButtonElement;

const cells: HTMLInputElement[] = [];
let givens: number[] = [];
let steps: Step[] = [];
let cur = 0;
let solved = false;
let timer: number | null = null;
let selected = -1;

// Cells are real inputs, so keyboard, screen readers and phone focus work without extra code

function select(i: number): void {
  selected = i;
  const r = Math.floor(i / 9), c = i % 9, b = boxOf(i);
  cells.forEach((el, j) => {
    el.classList.toggle('sel', j === i);
    el.classList.toggle(
      'rel',
      j !== i && (Math.floor(j / 9) === r || j % 9 === c || boxOf(j) === b),
    );
  });
}

const coarse = matchMedia('(pointer: coarse)').matches;
const MOVES: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };

for (let i = 0; i < 81; i++) {
  const r = Math.floor(i / 9), c = i % 9;
  const el = document.createElement('input');
  el.type = 'text';
  el.inputMode = coarse ? 'none' : 'numeric';
  el.maxLength = 1;
  el.autocomplete = 'off';
  el.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
  if (c === 2 || c === 5) el.classList.add('c2');
  if (r === 2 || r === 5) el.classList.add('r2');
  if (c === 8) el.classList.add('c8');
  if (r === 8) el.classList.add('r8');

  el.addEventListener('keydown', (e: KeyboardEvent) => {
    if (solved && !e.key.startsWith('Arrow') && e.key !== 'Tab') e.preventDefault();

    if (MOVES[e.key] !== undefined) {
      const j = i + MOVES[e.key];
      const wrap = (e.key === 'ArrowLeft' && c === 0) || (e.key === 'ArrowRight' && c === 8);
      if (j >= 0 && j < 81 && !wrap) {
        cells[j].focus();
        e.preventDefault();
      }
    } else if (!solved && (e.key === 'Backspace' || e.key === 'Delete')) {
      el.value = '';
      e.preventDefault();
      markConflicts();
    } else if (!solved && /^[1-9]$/.test(e.key)) {
      el.value = e.key;
      e.preventDefault();
      markConflicts();
      // stay on this cell so the user chooses where to go next
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  });
  el.addEventListener('input', () => {
    // some mobile keyboards send no key codes, so the typed value is cleaned up here instead
    el.value = /^[1-9]$/.test(el.value.slice(-1)) ? el.value.slice(-1) : '';
    markConflicts();
  });
  el.addEventListener('focus', () => {
    el.select();
    select(i);
  });
  grid.appendChild(el);
  cells.push(el);
}

const readGrid = (): number[] => cells.map((el) => (/^[1-9]$/.test(el.value) ? +el.value : 0));

function markConflicts(): void {
  const g = readGrid();
  const bad = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (!g[i] || solved) continue;
    for (let j = i + 1; j < 81; j++) {
      const peers =
        Math.floor(i / 9) === Math.floor(j / 9) || i % 9 === j % 9 || boxOf(i) === boxOf(j);
      if (g[j] === g[i] && peers) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  cells.forEach((el, i) => el.classList.toggle('conflict', bad.has(i)));
}

// One helper writes every status message, so steps and errors look consistent

function setMsg(text: string, sub?: string, isErr?: boolean): void {
  msg.className = isErr ? 'err' : '';
  msg.textContent = text;
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    msg.appendChild(s);
  }
}

function setProgress(): void {
  btn('count').textContent = `${cur} / ${steps.length}`;
  btn('fill').style.width = steps.length ? `${(cur / steps.length) * 100}%` : '0';
}

// The solver runs once up front; stepping only reveals its saved path, which makes Back free

function render(): void {
  const shown = new Map<number, number>();
  for (let k = 0; k < cur; k++) shown.set(steps[k].i, steps[k].d);
  const curCell = cur > 0 ? steps[cur - 1].i : -1;

  cells.forEach((el, i) => {
    el.classList.remove('placed', 'current');
    const placed = shown.get(i);
    if (givens[i]) el.value = String(givens[i]);
    else if (placed !== undefined) {
      el.value = String(placed);
      el.classList.add('placed');
    } else el.value = '';
    if (i === curCell) el.classList.add('current');
  });

  btn('prev').disabled = cur === 0;
  btn('next').disabled = cur === steps.length;
  btn('all').disabled = cur === steps.length;
  setProgress();

  if (cur === 0) {
    setMsg(`Ready: ${steps.length} steps to solve.`, 'Press Next step to begin.');
    return;
  }
  const s = steps[cur - 1];
  const r = Math.floor(s.i / 9) + 1, c = (s.i % 9) + 1;
  const why =
    s.opts === 1
      ? 'Only digit that fits this cell.'
      : `Fits this cell along with ${s.opts - 1} other digit${s.opts > 2 ? 's' : ''}; this one leads to the solution.`;
  setMsg(`Step ${cur} of ${steps.length}: place ${s.d} at row ${r}, column ${c}.`, why);
  if (cur === steps.length) {
    stop();
    setMsg(`Step ${cur} of ${steps.length}: place ${s.d} at row ${r}, column ${c}.`, `${why} Puzzle solved.`);
  }
}

function enterSolved(): void {
  solved = true;
  document.body.classList.add('solved');
  cells.forEach((el) => {
    el.readOnly = true;
    el.classList.remove('conflict');
  });
  btn('solve').disabled = true;
  btn('edit').disabled = false;
  btn('example').disabled = true;
  btn('clear').disabled = true;
}

function exitSolved(): void {
  solved = false;
  document.body.classList.remove('solved');
  steps = [];
  cur = 0;
  cells.forEach((el) => {
    el.readOnly = false;
    el.classList.remove('placed', 'current');
  });
  btn('solve').disabled = false;
  btn('edit').disabled = true;
  btn('example').disabled = false;
  btn('clear').disabled = false;
  btn('prev').disabled = true;
  btn('next').disabled = true;
  btn('all').disabled = true;
  setProgress();
}

function stop(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  btn('all').textContent = 'Show all steps';
}

function load(str: string): void {
  stop();
  exitSolved();
  cells.forEach((el, i) => {
    el.value = str[i] && str[i] !== '.' ? str[i] : '';
  });
  setMsg(READY);
  markConflicts();
}

btn('solve').onclick = () => {
  const g = readGrid();
  if (g.every((v) => v === 0)) {
    setMsg('Enter at least a few digits first.', '', true);
    return;
  }
  const res = solve(g);
  if (res.error !== undefined) {
    setMsg(res.error, '', true);
    return;
  }
  givens = g;
  steps = res.path;
  cur = 0;
  enterSolved();
  render();
};
btn('next').onclick = () => {
  stop();
  if (cur < steps.length) {
    cur++;
    render();
  }
};
btn('prev').onclick = () => {
  stop();
  if (cur > 0) {
    cur--;
    render();
  }
};
btn('all').onclick = () => {
  if (timer !== null) return stop();
  if (cur === steps.length) return;
  btn('all').textContent = 'Pause';
  timer = window.setInterval(() => {
    cur++;
    render();
  }, 350);
};
btn('edit').onclick = () => {
  stop();
  const g = givens.slice();
  exitSolved();
  cells.forEach((el, i) => {
    el.value = g[i] ? String(g[i]) : '';
  });
  setMsg(READY);
  markConflicts();
};
btn('example').onclick = () => load(EXAMPLE);
btn('clear').onclick = () => load('');

// The theme lives on <html>, so CSS tokens flip everywhere without touching single elements

const root = document.documentElement;
const themeBtn = btn('theme');
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
} catch {
  // private mode can block storage, so the theme just won't persist
}
const isDark = (): boolean =>
  (root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
const syncTheme = (): void => {
  themeBtn.setAttribute('aria-checked', String(isDark()));
};
themeBtn.onclick = () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try {
    localStorage.setItem('theme', root.dataset.theme);
  } catch {
    // private mode can block storage, so the theme just won't persist
  }
  syncTheme();
};

syncTheme();
// enable the switch animation only after the first paint, so it doesn't slide on load
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('ready')));
setMsg(READY);
setProgress();

// Touch screens can't reliably type into cells, so the pad writes into the selected cell

function enterDigit(d: string): void {
  if (solved) return;
  const i = selected < 0 ? 0 : selected;
  cells[i].value = d;
  markConflicts();
  cells[i].focus();
}

const pad = document.getElementById('pad') as HTMLElement;
[...'123456789', ''].forEach((d) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = d || 'Erase';
  b.setAttribute('aria-label', d ? `Enter ${d}` : 'Erase cell');
  b.onclick = () => enterDigit(d);
  pad.appendChild(b);
});

// The rule diagrams are built here so the HTML stays short

const MINI_DIGITS: Record<string, string> = { row: '534678912', col: '468259713', box: '974268531' };

document.querySelectorAll<HTMLElement>('.mini').forEach((host) => {
  const kind = host.dataset.kind ?? 'row';
  const digits = MINI_DIGITS[kind];
  let k = 0;
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const on = kind === 'row' ? r === 3 : kind === 'col' ? c === 5 : r < 3 && c > 5;
    const s = document.createElement('span');
    if (on) {
      s.className = 'on';
      s.textContent = digits[k++];
    }
    if (c === 2 || c === 5) s.classList.add('c2');
    if (r === 2 || r === 5) s.classList.add('r2');
    if (c === 8) s.classList.add('c8');
    if (r === 8) s.classList.add('r8');
    host.appendChild(s);
  }
});

// Hash routing keeps both pages in one file, so it still opens by double-click

const viewSolver = document.getElementById('view-solver') as HTMLElement;
const viewLearn = document.getElementById('view-learn') as HTMLElement;

function route(): void {
  const learn = location.hash === '#learn';
  viewSolver.hidden = learn;
  viewLearn.hidden = !learn;
  document.querySelectorAll<HTMLAnchorElement>('nav a').forEach((a) => {
    if (a.hash === (learn ? '#learn' : '#solver')) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();

btn('try').onclick = () => {
  load(EXAMPLE);
  location.hash = '#solver';
};
