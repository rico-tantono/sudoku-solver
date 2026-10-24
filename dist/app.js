"use strict";
(() => {
  // src/solver.ts
  var boxOf = (i) => Math.floor(i / 27) * 3 + Math.floor(i % 9 / 3);
  var popcount = (m) => {
    let n = 0;
    while (m) {
      m &= m - 1;
      n++;
    }
    return n;
  };
  function solve(g) {
    const rows = Array(9).fill(0);
    const cols = Array(9).fill(0);
    const boxes = Array(9).fill(0);
    const empties = [];
    for (let i = 0; i < 81; i++) {
      if (g[i]) {
        const bit = 1 << g[i] - 1;
        const r = Math.floor(i / 9), c = i % 9, b = boxOf(i);
        if ((rows[r] | cols[c] | boxes[b]) & bit) {
          return { error: "Digit " + g[i] + " appears twice in the same row, column, or box." };
        }
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
      } else {
        empties.push(i);
      }
    }
    const path = [];
    function bt(n) {
      if (n === empties.length) return true;
      let bi = -1, bm = 0, bc = 10;
      for (let k = n; k < empties.length; k++) {
        const i2 = empties[k];
        const used = rows[Math.floor(i2 / 9)] | cols[i2 % 9] | boxes[boxOf(i2)];
        const av = ~used & 511;
        const cnt = popcount(av);
        if (cnt < bc) {
          bi = k;
          bm = av;
          bc = cnt;
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
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
        path.push({ i, d, opts: bc });
        if (bt(n + 1)) return true;
        path.pop();
        rows[r] ^= bit;
        cols[c] ^= bit;
        boxes[b] ^= bit;
      }
      [empties[n], empties[bi]] = [empties[bi], empties[n]];
      return false;
    }
    return bt(0) ? { path } : { error: "This puzzle has no solution. Check the digits you entered." };
  }

  // src/main.ts
  var EXAMPLE = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79";
  var READY = "Enter a puzzle, then press Solve.";
  var grid = document.getElementById("grid");
  var msg = document.getElementById("msg");
  var btn = (id) => document.getElementById(id);
  var cells = [];
  var givens = [];
  var steps = [];
  var cur = 0;
  var solved = false;
  var timer = null;
  var selected = -1;
  function select(i) {
    selected = i;
    const r = Math.floor(i / 9), c = i % 9, b = boxOf(i);
    cells.forEach((el, j) => {
      el.classList.toggle("sel", j === i);
      el.classList.toggle(
        "rel",
        j !== i && (Math.floor(j / 9) === r || j % 9 === c || boxOf(j) === b)
      );
    });
  }
  var coarse = matchMedia("(pointer: coarse)").matches;
  var MOVES = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const el = document.createElement("input");
    el.type = "text";
    el.inputMode = coarse ? "none" : "numeric";
    el.maxLength = 1;
    el.autocomplete = "off";
    el.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
    if (c === 2 || c === 5) el.classList.add("c2");
    if (r === 2 || r === 5) el.classList.add("r2");
    if (c === 8) el.classList.add("c8");
    if (r === 8) el.classList.add("r8");
    el.addEventListener("keydown", (e) => {
      if (solved && !e.key.startsWith("Arrow") && e.key !== "Tab") e.preventDefault();
      if (MOVES[e.key] !== void 0) {
        const j = i + MOVES[e.key];
        const wrap = e.key === "ArrowLeft" && c === 0 || e.key === "ArrowRight" && c === 8;
        if (j >= 0 && j < 81 && !wrap) {
          cells[j].focus();
          e.preventDefault();
        }
      } else if (!solved && (e.key === "Backspace" || e.key === "Delete")) {
        el.value = "";
        e.preventDefault();
        markConflicts();
      } else if (!solved && /^[1-9]$/.test(e.key)) {
        el.value = e.key;
        e.preventDefault();
        markConflicts();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    });
    el.addEventListener("input", () => {
      el.value = /^[1-9]$/.test(el.value.slice(-1)) ? el.value.slice(-1) : "";
      markConflicts();
    });
    el.addEventListener("focus", () => {
      el.select();
      select(i);
    });
    grid.appendChild(el);
    cells.push(el);
  }
  var readGrid = () => cells.map((el) => /^[1-9]$/.test(el.value) ? +el.value : 0);
  function markConflicts() {
    const g = readGrid();
    const bad = /* @__PURE__ */ new Set();
    for (let i = 0; i < 81; i++) {
      if (!g[i] || solved) continue;
      for (let j = i + 1; j < 81; j++) {
        const peers = Math.floor(i / 9) === Math.floor(j / 9) || i % 9 === j % 9 || boxOf(i) === boxOf(j);
        if (g[j] === g[i] && peers) {
          bad.add(i);
          bad.add(j);
        }
      }
    }
    cells.forEach((el, i) => el.classList.toggle("conflict", bad.has(i)));
  }
  function setMsg(text, sub, isErr) {
    msg.className = isErr ? "err" : "";
    msg.textContent = text;
    if (sub) {
      const s = document.createElement("small");
      s.textContent = sub;
      msg.appendChild(s);
    }
  }
  function setProgress() {
    btn("count").textContent = `${cur} / ${steps.length}`;
    btn("fill").style.width = steps.length ? `${cur / steps.length * 100}%` : "0";
  }
  function render() {
    const shown = /* @__PURE__ */ new Map();
    for (let k = 0; k < cur; k++) shown.set(steps[k].i, steps[k].d);
    const curCell = cur > 0 ? steps[cur - 1].i : -1;
    cells.forEach((el, i) => {
      el.classList.remove("placed", "current");
      const placed = shown.get(i);
      if (givens[i]) el.value = String(givens[i]);
      else if (placed !== void 0) {
        el.value = String(placed);
        el.classList.add("placed");
      } else el.value = "";
      if (i === curCell) el.classList.add("current");
    });
    btn("prev").disabled = cur === 0;
    btn("next").disabled = cur === steps.length;
    btn("all").disabled = cur === steps.length;
    setProgress();
    if (cur === 0) {
      setMsg(`Ready: ${steps.length} steps to solve.`, "Press Next step to begin.");
      return;
    }
    const s = steps[cur - 1];
    const r = Math.floor(s.i / 9) + 1, c = s.i % 9 + 1;
    const why = s.opts === 1 ? "Only digit that fits this cell." : `Fits this cell along with ${s.opts - 1} other digit${s.opts > 2 ? "s" : ""}; this one leads to the solution.`;
    setMsg(`Step ${cur} of ${steps.length}: place ${s.d} at row ${r}, column ${c}.`, why);
    if (cur === steps.length) {
      stop();
      setMsg(`Step ${cur} of ${steps.length}: place ${s.d} at row ${r}, column ${c}.`, `${why} Puzzle solved.`);
    }
  }
  function enterSolved() {
    solved = true;
    document.body.classList.add("solved");
    cells.forEach((el) => {
      el.readOnly = true;
      el.classList.remove("conflict");
    });
    btn("solve").disabled = true;
    btn("edit").disabled = false;
    btn("example").disabled = true;
    btn("clear").disabled = true;
  }
  function exitSolved() {
    solved = false;
    document.body.classList.remove("solved");
    steps = [];
    cur = 0;
    cells.forEach((el) => {
      el.readOnly = false;
      el.classList.remove("placed", "current");
    });
    btn("solve").disabled = false;
    btn("edit").disabled = true;
    btn("example").disabled = false;
    btn("clear").disabled = false;
    btn("prev").disabled = true;
    btn("next").disabled = true;
    btn("all").disabled = true;
    setProgress();
  }
  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    btn("all").textContent = "Show all steps";
  }
  function load(str) {
    stop();
    exitSolved();
    cells.forEach((el, i) => {
      el.value = str[i] && str[i] !== "." ? str[i] : "";
    });
    setMsg(READY);
    markConflicts();
  }
  btn("solve").onclick = () => {
    const g = readGrid();
    if (g.every((v) => v === 0)) {
      setMsg("Enter at least a few digits first.", "", true);
      return;
    }
    const res = solve(g);
    if (res.error !== void 0) {
      setMsg(res.error, "", true);
      return;
    }
    givens = g;
    steps = res.path;
    cur = 0;
    enterSolved();
    render();
  };
  btn("next").onclick = () => {
    stop();
    if (cur < steps.length) {
      cur++;
      render();
    }
  };
  btn("prev").onclick = () => {
    stop();
    if (cur > 0) {
      cur--;
      render();
    }
  };
  btn("all").onclick = () => {
    if (timer !== null) return stop();
    if (cur === steps.length) return;
    btn("all").textContent = "Pause";
    timer = window.setInterval(() => {
      cur++;
      render();
    }, 350);
  };
  btn("edit").onclick = () => {
    stop();
    const g = givens.slice();
    exitSolved();
    cells.forEach((el, i) => {
      el.value = g[i] ? String(g[i]) : "";
    });
    setMsg(READY);
    markConflicts();
  };
  btn("example").onclick = () => load(EXAMPLE);
  btn("clear").onclick = () => load("");
  var root = document.documentElement;
  var themeBtn = btn("theme");
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch {
  }
  var isDark = () => (root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
  var syncTheme = () => {
    themeBtn.setAttribute("aria-checked", String(isDark()));
  };
  themeBtn.onclick = () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try {
      localStorage.setItem("theme", root.dataset.theme);
    } catch {
    }
    syncTheme();
  };
  syncTheme();
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("ready")));
  setMsg(READY);
  setProgress();
  function enterDigit(d) {
    if (solved) return;
    const i = selected < 0 ? 0 : selected;
    cells[i].value = d;
    markConflicts();
    cells[i].focus();
  }
  var pad = document.getElementById("pad");
  [..."123456789", ""].forEach((d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = d || "Erase";
    b.setAttribute("aria-label", d ? `Enter ${d}` : "Erase cell");
    b.onclick = () => enterDigit(d);
    pad.appendChild(b);
  });
  var MINI_DIGITS = { row: "534678912", col: "468259713", box: "974268531" };
  document.querySelectorAll(".mini").forEach((host) => {
    const kind = host.dataset.kind ?? "row";
    const digits = MINI_DIGITS[kind];
    let k = 0;
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9;
      const on = kind === "row" ? r === 3 : kind === "col" ? c === 5 : r < 3 && c > 5;
      const s = document.createElement("span");
      if (on) {
        s.className = "on";
        s.textContent = digits[k++];
      }
      if (c === 2 || c === 5) s.classList.add("c2");
      if (r === 2 || r === 5) s.classList.add("r2");
      if (c === 8) s.classList.add("c8");
      if (r === 8) s.classList.add("r8");
      host.appendChild(s);
    }
  });
  var viewSolver = document.getElementById("view-solver");
  var viewLearn = document.getElementById("view-learn");
  function route() {
    const learn = location.hash === "#learn";
    viewSolver.hidden = learn;
    viewLearn.hidden = !learn;
    document.querySelectorAll("nav a").forEach((a) => {
      if (a.hash === (learn ? "#learn" : "#solver")) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
  btn("try").onclick = () => {
    load(EXAMPLE);
    location.hash = "#solver";
  };
})();
