const EPS = "ε";
const Z0 = "Z₀";

/**
 * If you duplicate this project, change PROJECT_ID to a unique string (e.g. "lab", "v2").
 * That gives this copy its own localStorage theme key so it won't clash with the other copy
 * when both are opened from the same origin (same host/port, or some file:// setups).
 */
const PROJECT_ID = "taflrishikafinalpdavisualiser";
const THEME_KEY = `pda-sim-theme-${PROJECT_ID}`;
/** Old full-save key; only cleared for the default project id to avoid wiping another copy's data. */
const LEGACY_FULL_SAVE_KEY = "pda-simulator-v1";

/** Range input is inverted: right = shorter delay (faster). */
const SPEED_RANGE_MIN = 100;
const SPEED_RANGE_MAX = 1500;
function speedSliderToDelayMs(pos) {
  return SPEED_RANGE_MIN + SPEED_RANGE_MAX - pos;
}
function delayMsToSpeedSlider(ms) {
  return SPEED_RANGE_MIN + SPEED_RANGE_MAX - ms;
}

/** Logical canvas size; grows with graph complexity so labels have room. */
function computeDiagramSize() {
  const n = model.pda.states.length;
  const m = model.pda.transitions.length;
  const pairs = new Set(model.pda.transitions.map((t) => `${t.from}->${t.to}`)).size;
  const maxParallel = Math.max(
    1,
    ...Array.from(
      model.pda.transitions.reduce((acc, t) => {
        const k = `${t.from}->${t.to}`;
        acc.set(k, (acc.get(k) || 0) + 1);
        return acc;
      }, new Map())
      .values()
    )
  );
  /* Balanced width/height; extra room when many parallel edges reduces arrow/label overlap. */
  let w =
    820 +
    Math.max(0, n - 3) * 110 +
    Math.max(0, m - 8) * 36 +
    Math.max(0, pairs - 6) * 24 +
    Math.max(0, maxParallel - 2) * 52;
  let h =
    700 +
    Math.max(0, n - 3) * 58 +
    Math.max(0, m - 8) * 16 +
    Math.max(0, maxParallel - 2) * 38 +
    Math.max(0, maxParallel - 1) * 24;
  w = Math.min(2600, Math.max(720, w));
  h = Math.min(1200, Math.max(580, h));
  const ar = w / h;
  if (ar > 1.32) {
    h = Math.min(1200, Math.max(580, Math.round(w / 1.25)));
  } else if (ar < 0.92) {
    w = Math.min(2600, Math.max(720, Math.round(h * 1.22)));
  }
  return { w, h };
}

const els = {
  presetSelect: document.getElementById("presetSelect"),
  importBtn: document.getElementById("importBtn"),
  exportBtn: document.getElementById("exportBtn"),
  themeBtn: document.getElementById("themeBtn"),
  importFileInput: document.getElementById("importFileInput"),
  addStateBtn: document.getElementById("addStateBtn"),
  addTransitionBtn: document.getElementById("addTransitionBtn"),
  statesList: document.getElementById("statesList"),
  transitionsList: document.getElementById("transitionsList"),
  transitionCount: document.getElementById("transitionCount"),
  inputString: document.getElementById("inputString"),
  tokenRow: document.getElementById("tokenRow"),
  currentCharHint: document.getElementById("currentCharHint"),
  positionLabel: document.getElementById("positionLabel"),
  resetBtn: document.getElementById("resetBtn"),
  backBtn: document.getElementById("backBtn"),
  stepBtn: document.getElementById("stepBtn"),
  runBtn: document.getElementById("runBtn"),
  speedSlider: document.getElementById("speedSlider"),
  speedValue: document.getElementById("speedValue"),
  speedBtns: document.querySelectorAll(".speed-btn"),
  autoRunToggle: document.getElementById("autoRunToggle"),
  resultBanner: document.getElementById("resultBanner"),
  resultDismiss: document.getElementById("resultDismiss"),
  logBody: document.getElementById("logBody"),
  stepCounter: document.getElementById("stepCounter"),
  branchingHint: document.getElementById("branchingHint"),
  branchingTree: document.getElementById("branchingTree"),
  stackView: document.getElementById("stackView"),
  stackOverflowBanner: document.getElementById("stackOverflowBanner"),
  stackIconAnim: document.getElementById("stackIconAnim"),
  depthLabel: document.getElementById("depthLabel"),
  stackWarning: document.getElementById("stackWarning"),
  diagram: document.getElementById("diagram"),
  diagramEmpty: document.getElementById("diagramEmpty"),
  diagramWrap: document.querySelector(".diagram-wrap"),
  autoLayoutBtn: document.getElementById("autoLayoutBtn"),
  toastContainer: document.getElementById("toastContainer"),
};

const presets = [
  {
    key: "anbn",
    label: "aⁿbⁿ recognizer (n ≥ 1)",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: false },
      { id: "qf", name: "qf", isStart: false, isAccept: true },
    ],
    /* Matches standard textbook PDA: q₀ pushes a’s (stack holds a…a Z₀); first b → q₁; each b pops one a; ε with Z₀ → qf. */
    transitions: [
      { from: "q0", input: "a", stackTop: Z0, to: "q0", push: ["a", Z0] },
      { from: "q0", input: "a", stackTop: "a", to: "q0", push: ["a", "a"] },
      { from: "q0", input: "b", stackTop: "a", to: "q1", push: [EPS] },
      { from: "q1", input: "b", stackTop: "a", to: "q1", push: [EPS] },
      { from: "q1", input: EPS, stackTop: Z0, to: "qf", push: [Z0] },
    ],
    input: "aabb",
  },
  {
    key: "pal",
    label: "Palindrome {a,b}",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: false },
      { id: "q2", name: "q2", isStart: false, isAccept: true },
    ],
    transitions: [
      { from: "q0", input: "a", stackTop: Z0, to: "q0", push: ["a", Z0] },
      { from: "q0", input: "b", stackTop: Z0, to: "q0", push: ["b", Z0] },
      { from: "q0", input: "a", stackTop: "a", to: "q0", push: ["a", "a"] },
      { from: "q0", input: "b", stackTop: "a", to: "q0", push: ["b", "a"] },
      { from: "q0", input: "a", stackTop: "b", to: "q0", push: ["a", "b"] },
      { from: "q0", input: "b", stackTop: "b", to: "q0", push: ["b", "b"] },
      /* Odd palindrome: consume middle symbol, keep stack; single-symbol palindromes a/b. */
      { from: "q0", input: "a", stackTop: Z0, to: "q1", push: [Z0] },
      { from: "q0", input: "b", stackTop: Z0, to: "q1", push: [Z0] },
      { from: "q0", input: "a", stackTop: "b", to: "q1", push: ["b"] },
      { from: "q0", input: "b", stackTop: "a", to: "q1", push: ["a"] },
      { from: "q0", input: EPS, stackTop: "a", to: "q1", push: ["a"] },
      { from: "q0", input: EPS, stackTop: "b", to: "q1", push: ["b"] },
      { from: "q0", input: EPS, stackTop: Z0, to: "q2", push: [Z0] },
      { from: "q1", input: "a", stackTop: "a", to: "q1", push: [EPS] },
      { from: "q1", input: "b", stackTop: "b", to: "q1", push: [EPS] },
      { from: "q1", input: EPS, stackTop: Z0, to: "q2", push: [Z0] },
    ],
    input: "abba",
  },
  {
    key: "wcwr",
    label: "w c w^R (w in {a,b}+, centered by c)",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: false },
      { id: "qf", name: "qf", isStart: false, isAccept: true },
    ],
    /* q0: push every a/b from w, c moves to q1 without changing stack, q1: exact pop-match against w^R, then accept on Z0. */
    transitions: [
      { from: "q0", input: "a", stackTop: Z0, to: "q0", push: ["a", Z0] },
      { from: "q0", input: "a", stackTop: "a", to: "q0", push: ["a", "a"] },
      { from: "q0", input: "a", stackTop: "b", to: "q0", push: ["a", "b"] },
      { from: "q0", input: "b", stackTop: Z0, to: "q0", push: ["b", Z0] },
      { from: "q0", input: "b", stackTop: "a", to: "q0", push: ["b", "a"] },
      { from: "q0", input: "b", stackTop: "b", to: "q0", push: ["b", "b"] },
      { from: "q0", input: "c", stackTop: "a", to: "q1", push: ["a"] },
      { from: "q0", input: "c", stackTop: "b", to: "q1", push: ["b"] },
      { from: "q1", input: "a", stackTop: "a", to: "q1", push: [EPS] },
      { from: "q1", input: "b", stackTop: "b", to: "q1", push: [EPS] },
      { from: "q1", input: EPS, stackTop: Z0, to: "qf", push: [Z0] },
    ],
    input: "abbcbba",
  },
  {
    key: "wwr",
    label: "w w^R (even palindrome, ε-guess center)",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: false },
      { id: "qf", name: "qf", isStart: false, isAccept: true },
    ],
    /* NC: push a/b; nondeterministic ε to q1 guesses the center (stack unchanged). C: pop-match; accept ε,Z₀/Z₀ at qf. No ε with Z₀→q1 so ε is not accepted (w ∈ {a,b}+). */
    transitions: [
      { from: "q0", input: "a", stackTop: Z0, to: "q0", push: ["a", Z0] },
      { from: "q0", input: "a", stackTop: "a", to: "q0", push: ["a", "a"] },
      { from: "q0", input: "a", stackTop: "b", to: "q0", push: ["a", "b"] },
      { from: "q0", input: "b", stackTop: Z0, to: "q0", push: ["b", Z0] },
      { from: "q0", input: "b", stackTop: "a", to: "q0", push: ["b", "a"] },
      { from: "q0", input: "b", stackTop: "b", to: "q0", push: ["b", "b"] },
      { from: "q0", input: EPS, stackTop: "a", to: "q1", push: ["a"] },
      { from: "q0", input: EPS, stackTop: "b", to: "q1", push: ["b"] },
      { from: "q1", input: "a", stackTop: "a", to: "q1", push: [EPS] },
      { from: "q1", input: "b", stackTop: "b", to: "q1", push: [EPS] },
      { from: "q1", input: EPS, stackTop: Z0, to: "qf", push: [Z0] },
    ],
    input: "abba",
  },
  {
    key: "anb2n-push2",
    label: "aⁿb²ⁿ (n≥1): push 2 a’s per a",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: false },
      { id: "qf", name: "qf", isStart: false, isAccept: true },
    ],
    /* Case 1: each a adds two stack symbols; each b pops one a. First b switches to q1. */
    transitions: [
      { from: "q0", input: "a", stackTop: Z0, to: "q0", push: ["a", "a", Z0] },
      { from: "q0", input: "a", stackTop: "a", to: "q0", push: ["a", "a", "a"] },
      { from: "q0", input: "b", stackTop: "a", to: "q1", push: [EPS] },
      { from: "q1", input: "b", stackTop: "a", to: "q1", push: [EPS] },
      { from: "q1", input: EPS, stackTop: Z0, to: "qf", push: [Z0] },
    ],
    input: "aabbbb",
  },
  {
    key: "anb2n-skip-pop",
    label: "aⁿb²ⁿ (n≥1): push 1 a, alternate b’s",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: false },
      { id: "q2", name: "q2", isStart: false, isAccept: false },
      { id: "qf", name: "qf", isStart: false, isAccept: true },
    ],
    /* Case 2: one a per push; odd b’s (b,a/a) vs even b’s (b,a/ε); accept from q2 when stack Z₀. */
    transitions: [
      { from: "q0", input: "a", stackTop: Z0, to: "q0", push: ["a", Z0] },
      { from: "q0", input: "a", stackTop: "a", to: "q0", push: ["a", "a"] },
      { from: "q0", input: "b", stackTop: "a", to: "q1", push: ["a"] },
      { from: "q1", input: "b", stackTop: "a", to: "q2", push: [EPS] },
      { from: "q2", input: "b", stackTop: "a", to: "q1", push: ["a"] },
      { from: "q2", input: EPS, stackTop: Z0, to: "qf", push: [Z0] },
    ],
    input: "aabbbb",
  },
  {
    key: "paren",
    label: "Balanced parentheses",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: true },
    ],
    transitions: [
      { from: "q0", input: "(", stackTop: Z0, to: "q0", push: ["(", Z0] },
      { from: "q0", input: "(", stackTop: "(", to: "q0", push: ["(", "("] },
      { from: "q0", input: ")", stackTop: "(", to: "q0", push: [EPS] },
      { from: "q0", input: EPS, stackTop: Z0, to: "q1", push: [Z0] },
    ],
    input: "(())",
  },
  {
    key: "anbncn",
    label: "aⁿbⁿcⁿ (expected reject)",
    states: [
      { id: "q0", name: "q0", isStart: true, isAccept: false },
      { id: "q1", name: "q1", isStart: false, isAccept: false },
      { id: "q2", name: "q2", isStart: false, isAccept: true },
    ],
    transitions: [
      { from: "q0", input: "a", stackTop: Z0, to: "q0", push: ["A", Z0] },
      { from: "q0", input: "a", stackTop: "A", to: "q0", push: ["A", "A"] },
      { from: "q0", input: "b", stackTop: "A", to: "q1", push: [EPS] },
      { from: "q1", input: "b", stackTop: "A", to: "q1", push: [EPS] },
      { from: "q1", input: EPS, stackTop: Z0, to: "q2", push: [Z0] },
    ],
    input: "aabbcc",
  },
];

const model = {
  pda: structuredClone(presets[0]),
  input: "aabb",
  path: [],
  actionPath: [],
  branchInfo: [],
  currentStep: 0,
  accepted: false,
  resultReason: "",
  autoTimer: null,
  positions: {},
  usedEdges: new Set(),
  layoutW: 720,
  layoutH: 620,
  diagramViewBox: { x: 0, y: 0, w: 720, h: 620 },
  hoverEdgeKey: null,
  resultDismissed: false,
  _prevStackDepth: null,
  _lastStackSig: "",
};

function showToast(text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  els.toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function stackChipsHtml(stack) {
  return stack.map((sym) => `<span class="stack-chip${sym === Z0 ? " is-z0" : ""}">${escapeHtml(sym)}</span>`).join("");
}

function transitionInvalid(t) {
  const ids = new Set(model.pda.states.map((s) => s.id));
  return !ids.has(t.from) || !ids.has(t.to);
}

function updateEdgeHoverClasses() {
  const svg = els.diagram;
  if (!svg) return;
  svg.querySelectorAll(".edge[data-key]").forEach((el) => {
    el.classList.toggle("hover", el.dataset.key === model.hoverEdgeKey);
  });
}

function edgeKey(t) {
  return `${t.from}|${t.input}|${t.stackTop}|${t.to}|${t.push.join(" ")}`;
}

function normalizePush(raw) {
  const val = raw.trim();
  if (!val) return [EPS];
  return val.split(/\s+/);
}

function stateById(id) {
  return model.pda.states.find((s) => s.id === id);
}

function getStartState() {
  return model.pda.states.find((s) => s.isStart)?.id || model.pda.states[0]?.id;
}

function signature(config) {
  return `${config.state}|${config.index}|${config.stack.join(",")}`;
}

function validTransitions(config) {
  const char = model.input[config.index];
  const top = config.stack[0];
  return model.pda.transitions.filter((t) => {
    if (t.from !== config.state) return false;
    const inputOk = t.input === EPS || t.input === char;
    const stackOk = t.stackTop === top;
    return inputOk && stackOk;
  });
}

function applyTransition(config, t) {
  const stack = config.stack.slice(1);
  if (!(t.push.length === 1 && t.push[0] === EPS)) {
    for (let i = t.push.length - 1; i >= 0; i -= 1) stack.unshift(t.push[i]);
  }
  return {
    state: t.to,
    index: config.index + (t.input === EPS ? 0 : 1),
    stack,
  };
}

function actionTags(from, t) {
  const tags = [];
  if (t.input !== EPS) tags.push({ cls: "consume", label: `consume ${t.input}` });
  if (t.input === EPS) tags.push({ cls: "eps", label: "ε-move" });
  tags.push({ cls: "pop", label: `Pop ${from.stack[0]}` });
  if (!(t.push.length === 1 && t.push[0] === EPS)) {
    tags.push({ cls: "push", label: `Push ${t.push.join("")}` });
  }
  return tags;
}

function runBfs() {
  const start = { state: getStartState(), index: 0, stack: [Z0] };
  if (!start.state) {
    model.path = [start];
    model.actionPath = [{ text: "Start", tags: [] }];
    model.accepted = false;
    model.resultReason = "No start state defined.";
    return;
  }
  const q = [{ config: start, parent: -1, action: { text: "Start", tags: [] }, tr: null }];
  const seen = new Set([signature(start)]);
  let end = -1;
  const MAX = 10000;
  let head = 0;
  while (head < q.length && q.length < MAX) {
    const node = q[head];
    const st = stateById(node.config.state);
    if (node.config.index === model.input.length && st && st.isAccept) {
      end = head;
      break;
    }
    const options = validTransitions(node.config);
    for (const t of options) {
      const nx = applyTransition(node.config, t);
      const sig = signature(nx);
      if (seen.has(sig)) continue;
      seen.add(sig);
      q.push({
        config: nx,
        parent: head,
        action: { text: `${t.from}→${t.to}`, tags: actionTags(node.config, t), transition: t },
        tr: t,
      });
    }
    head += 1;
  }

  if (q.length >= MAX) {
    model.accepted = false;
    model.resultReason = "Reached 10,000 configuration cap (epsilon-cycle protection).";
  }

  if (end < 0) {
    model.accepted = false;
    model.resultReason = model.resultReason || "No accepting configuration found.";
    end = head > 0 ? head - 1 : 0;
  } else {
    model.accepted = true;
    model.resultReason = `Reached accept state in ${end} explored steps.`;
  }

  const path = [];
  const actions = [];
  const usedEdges = new Set();
  let cur = end;
  while (cur >= 0) {
    path.push(q[cur].config);
    actions.push(q[cur].action);
    if (q[cur].tr) usedEdges.add(edgeKey(q[cur].tr));
    cur = q[cur].parent;
  }
  model.path = path.reverse();
  model.actionPath = actions.reverse();
  model.currentStep = Math.min(model.currentStep, model.path.length - 1);
  model.usedEdges = usedEdges;
}

function saveState() {
  try {
    const theme = document.body.dataset.theme === "light" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode / blocked storage */
  }
}

function flashInvalidInput() {
  els.inputString.style.borderColor = "var(--red)";
  setTimeout(() => {
    els.inputString.style.borderColor = "";
  }, 300);
}

function renderStates() {
  els.statesList.innerHTML = "";
  const currentState = model.path[model.currentStep]?.state;
  model.pda.states.forEach((s, idx) => {
    const row = document.createElement("div");
    row.className = `state-row-premium${s.id === currentState ? " active" : ""}`;
    row.style.setProperty("--stagger", `${idx * 30}ms`);
    row.innerHTML = `
      <span class="state-dot ${s.id === currentState ? "is-live" : ""}" aria-hidden="true"></span>
      <input class="state-name" type="text" value="${escapeAttr(s.name)}" maxlength="40" aria-label="State name">
      <div class="state-badge-row">
        <button type="button" class="state-badge state-badge-start ${s.isStart ? "on" : ""}" title="Start state">S</button>
        <button type="button" class="state-badge state-badge-accept ${s.isAccept ? "on" : ""}" title="Accept state">A</button>
      </div>
      <div class="state-menu">
        <button type="button" class="state-menu-trigger" aria-label="State menu" aria-expanded="false">⋯</button>
        <div class="state-menu-dropdown" hidden>
          <button type="button" class="state-menu-delete">Delete state</button>
        </div>
      </div>`;
    const nameInput = row.querySelector(".state-name");
    const [startBtn, accBtn] = row.querySelectorAll(".state-badge-row button");
    const menuTrigger = row.querySelector(".state-menu-trigger");
    const menuDrop = row.querySelector(".state-menu-dropdown");
    const delMenu = row.querySelector(".state-menu-delete");

    nameInput.addEventListener("change", () => {
      const oldId = s.id;
      const next = nameInput.value.trim() || oldId;
      s.name = next;
      s.id = next;
      model.pda.transitions.forEach((tr) => {
        if (tr.from === oldId) tr.from = next;
        if (tr.to === oldId) tr.to = next;
      });
      recompute();
    });
    startBtn.addEventListener("click", () => {
      model.pda.states.forEach((x) => {
        x.isStart = false;
      });
      s.isStart = true;
      recompute();
    });
    accBtn.addEventListener("click", () => {
      s.isAccept = !s.isAccept;
      recompute();
    });
    menuTrigger.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const open = menuDrop.hidden;
      document.querySelectorAll(".state-menu-dropdown").forEach((d) => {
        d.hidden = true;
      });
      menuDrop.hidden = !open;
      menuTrigger.setAttribute("aria-expanded", String(!open));
    });
    delMenu.addEventListener("click", () => {
      model.pda.states = model.pda.states.filter((x) => x !== s);
      model.pda.transitions = model.pda.transitions.filter((t) => t.from !== s.id && t.to !== s.id);
      menuDrop.hidden = true;
      recompute();
    });
    els.statesList.appendChild(row);
  });
}

function renderTransitions() {
  els.transitionsList.innerHTML = "";
  els.transitionCount.textContent = String(model.pda.transitions.length);
  const activeTr = model.actionPath[model.currentStep]?.transition;
  model.pda.transitions.forEach((t, idx) => {
    const card = document.createElement("div");
    const isActive = activeTr && edgeKey(activeTr) === edgeKey(t);
    const bad = transitionInvalid(t);
    card.className = `transition-card${isActive ? " active" : ""}${bad ? " invalid" : ""}`;
    card.dataset.edgeKey = edgeKey(t);
    card.style.setProperty("--stagger", `${idx * 30}ms`);
    if (bad) card.title = "From/To must reference existing states.";
    const stateOpts = model.pda.states.map((s) => `<option ${s.id === t.from ? "selected" : ""}>${escapeHtml(s.id)}</option>`).join("");
    const toOpts = model.pda.states.map((s) => `<option ${s.id === t.to ? "selected" : ""}>${escapeHtml(s.id)}</option>`).join("");
    const inputIsEps = t.input === EPS;
    card.innerHTML = `
      <div class="transition-head">
        <strong class="transition-arrow"><span class="t-from">${escapeHtml(t.from)}</span> <span class="t-arr">→</span> <span class="t-to">${escapeHtml(t.to)}</span></strong>
        <button type="button" class="btn ghost transition-del" aria-label="Delete transition">✕</button>
      </div>
      <div class="transition-grid">
        <label class="tbox"><input class="t-input ${inputIsEps ? "is-eps" : ""}" value="${escapeAttr(t.input)}" title="ε — no input consumed"><small>input</small></label>
        <label class="tbox"><input class="t-stacktop" value="${escapeAttr(t.stackTop)}"><small>stack top</small></label>
        <label class="tbox"><input class="t-push" value="${escapeAttr(t.push.join(" "))}"><small>push (top-first)</small></label>
      </div>
      <div class="transition-grid transition-grid-row2">
        <label class="tbox"><select class="t-fromsel">${stateOpts}</select><small>from</small></label>
        <label class="tbox"><select class="t-tosel">${toOpts}</select><small>to</small></label>
        <span></span>
      </div>`;
    const del = card.querySelector(".transition-del");
    const input = card.querySelector(".t-input");
    const top = card.querySelector(".t-stacktop");
    const push = card.querySelector(".t-push");
    const fromSel = card.querySelector(".t-fromsel");
    const toSel = card.querySelector(".t-tosel");

    const syncEpsClass = () => {
      input.classList.toggle("is-eps", t.input === EPS);
      input.title = t.input === EPS ? "ε — no input consumed" : "";
    };

    del.addEventListener("click", () => {
      model.pda.transitions = model.pda.transitions.filter((x) => x !== t);
      recompute();
    });
    input.addEventListener("change", () => {
      t.input = input.value.trim() || EPS;
      syncEpsClass();
      recompute();
    });
    top.addEventListener("change", () => {
      t.stackTop = top.value.trim() || Z0;
      recompute();
    });
    push.addEventListener("change", () => {
      t.push = normalizePush(push.value);
      recompute();
    });
    fromSel.addEventListener("change", () => {
      t.from = fromSel.value;
      recompute();
    });
    toSel.addEventListener("change", () => {
      t.to = toSel.value;
      recompute();
    });

    card.addEventListener("mouseenter", () => {
      model.hoverEdgeKey = edgeKey(t);
      updateEdgeHoverClasses();
    });
    card.addEventListener("mouseleave", () => {
      model.hoverEdgeKey = null;
      updateEdgeHoverClasses();
    });

    els.transitionsList.appendChild(card);
  });
}

function renderTokens() {
  const step = model.path[model.currentStep] || { index: 0 };
  els.tokenRow.innerHTML = "";
  [...model.input].forEach((ch, i) => {
    const token = document.createElement("div");
    token.className = "token";
    if (i < step.index) token.classList.add("consumed");
    if (i === step.index) token.classList.add("current");
    token.textContent = ch || " ";
    els.tokenRow.appendChild(token);
  });
  els.positionLabel.textContent = `Position ${Math.min(step.index, model.input.length)} of ${model.input.length}`;
  if (els.currentCharHint) {
    if (step.index < model.input.length) {
      const ch = model.input[step.index];
      els.currentCharHint.textContent = `Current character: “${ch || "·"}”`;
      els.currentCharHint.classList.add("is-visible");
    } else {
      els.currentCharHint.textContent = "End of input";
      els.currentCharHint.classList.add("is-visible");
    }
  }
}

function tagsHtml(tags) {
  return tags.map((t) => `<span class="tag ${t.cls}">${escapeHtml(t.label)}</span>`).join("");
}

/** Scroll the current log row inside `.log-table-wrap` only — never the document (scrollIntoView would pull the whole page when the log is off-screen). */
function scrollLogRowIntoWrap(tr) {
  const wrap = els.logBody?.closest(".log-table-wrap");
  if (!wrap || !tr) return;
  const trRect = tr.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  const pad = 8;
  const overTop = trRect.top - wrapRect.top - pad;
  const overBot = trRect.bottom - wrapRect.bottom + pad;
  if (overTop < 0) wrap.scrollTop += overTop;
  else if (overBot > 0) wrap.scrollTop += overBot;
}

function renderLog() {
  els.logBody.innerHTML = "";
  model.path.forEach((cfg, i) => {
    const tr = document.createElement("tr");
    if (i === model.currentStep) tr.classList.add("current");
    const remain = model.input.slice(cfg.index);
    const action = model.actionPath[i] || { text: "", tags: [] };
    const tagStr = i === 0 ? tagsHtml([{ cls: "tstart", label: "● Start" }]) : tagsHtml(action.tags);
    tr.innerHTML = `<td>${i}</td><td class="mono">${escapeHtml(cfg.state)}</td><td class="mono">${escapeHtml(remain)}</td><td class="stack-cells-td">${stackChipsHtml(cfg.stack)}</td><td class="action-td">${tagStr}</td>`;
    els.logBody.appendChild(tr);
    if (i === model.currentStep) scrollLogRowIntoWrap(tr);
  });
  els.stepCounter.textContent = `Step ${model.currentStep} / ${Math.max(0, model.path.length - 1)}`;
  const curCfg = model.path[model.currentStep] || { state: "", index: 0, stack: [Z0] };
  const options = validTransitions(curCfg);
  els.branchingHint.textContent = options.length > 1 ? `⑂ ${options.length} valid transitions from this configuration` : "";

  if (els.branchingTree) {
    if (options.length <= 1) {
      els.branchingTree.innerHTML = "";
    } else {
      const nextTaken = model.actionPath[model.currentStep + 1]?.transition;
      const rows = options.slice(0, 4).map((opt) => {
        const nx = applyTransition(curCfg, opt);
        const chosen = nextTaken && edgeKey(nextTaken) === edgeKey(opt);
        const rem = model.input.slice(nx.index);
        return `<div class="branch-ghost${chosen ? " chosen" : ""}"><span class="branch-ic">⑂</span><span class="mono">${escapeHtml(nx.state)}</span><span class="branch-sep">·</span><span class="mono">${escapeHtml(rem)}</span><span class="branch-sep">·</span><span class="mono">${escapeHtml(nx.stack.join(" "))}</span></div>`;
      });
      els.branchingTree.innerHTML = `<div class="branching-tree-inner">${rows.join("")}</div>`;
    }
  }
}

function renderStack() {
  const cfg = model.path[model.currentStep] || { stack: [Z0] };
  const sig = cfg.stack.join("|");
  const prevDepth = model._prevStackDepth;
  const grew = prevDepth !== null && cfg.stack.length > prevDepth;
  if (els.stackIconAnim && sig !== model._lastStackSig) {
    els.stackIconAnim.classList.add("shuffle");
    setTimeout(() => els.stackIconAnim.classList.remove("shuffle"), 480);
  }
  model._lastStackSig = sig;
  model._prevStackDepth = cfg.stack.length;

  els.stackView.innerHTML = "";
  if (cfg.stack.length === 0) {
    els.stackView.innerHTML = `<div class="stack-empty" role="status"><span class="stack-empty-icon" aria-hidden="true">▭</span><span>Empty</span></div>`;
  } else {
    cfg.stack.forEach((sym, i) => {
      const cell = document.createElement("div");
      cell.className = "stack-cell";
      if (sym === Z0) cell.classList.add("bottom");
      if (i === 0) cell.classList.add("push-glow");
      if (i === 0 && grew) cell.classList.add("stack-cell-enter");
      cell.textContent = sym;
      els.stackView.appendChild(cell);
    });
  }

  if (els.stackOverflowBanner) {
    els.stackOverflowBanner.classList.toggle("hidden", cfg.stack.length <= 20);
  }
  els.depthLabel.textContent = `Depth: ${cfg.stack.length}`;
  els.stackWarning.classList.toggle("hidden", cfg.stack.length <= 8);
}

function renderResult() {
  const finished = model.currentStep >= model.path.length - 1;
  if (!finished || model.resultDismissed) {
    els.resultBanner.classList.add("hidden");
    return;
  }
  els.resultBanner.classList.remove("hidden");
  els.resultBanner.classList.toggle("reject", !model.accepted);
  const icon = els.resultBanner.querySelector(".result-banner-icon");
  const text = els.resultBanner.querySelector(".result-banner-text");
  if (icon) icon.textContent = model.accepted ? "✓" : "✗";
  if (text) {
    text.textContent = model.accepted
      ? `String accepted — ${model.resultReason}`
      : `String rejected — ${model.resultReason}`;
  }
}

function getPos(stateIds) {
  const fallback = {};
  const dw = model.layoutW;
  const dh = model.layoutH;
  /* Inset keeps nodes away from layout edges; self-loops extend ~loopLift above/beside nodes. */
  const insetX = Math.max(64, dw * 0.055);
  const insetY = Math.max(88, dh * 0.085);
  const cx = dw / 2;
  const cy = dh / 2;
  const n = Math.max(1, stateIds.length);
  const innerW = dw - 2 * insetX;
  const innerH = dh - 2 * insetY;
  const r = Math.min(innerW, innerH) * (0.51 + Math.min(0.07, n * 0.008));
  /* +π/2: first state at bottom of circle so its self-loops arch upward into the canvas, not past y=0. */
  const angle0 = Math.PI / 2;
  stateIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / stateIds.length + angle0;
    fallback[id] = {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  });
  return { ...fallback, ...model.positions };
}

/** Crop viewBox to drawn content so preserveAspectRatio scales the graph large, not a sheet of empty space. */
function applyTightViewBox(svg, layers, fallbackW, fallbackH, nodeR = 32) {
  /* BBox ignores stroke, markers, and filters — extra margin (esp. top/left) avoids clipped nodes. */
  const slop = 6 + Math.round(nodeR * 0.22);
  const padL = 52 + slop + 12;
  const padT = 52 + slop + 10;
  const padR = 48 + slop;
  const padB = 48 + slop;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const layer of layers) {
    try {
      const b = layer.getBBox();
      if (b.width <= 0 && b.height <= 0) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    } catch {
      /* ignore */
    }
  }
  if (!Number.isFinite(minX) || minX === Infinity) {
    model.diagramViewBox = { x: 0, y: 0, w: fallbackW, h: fallbackH };
    svg.setAttribute("viewBox", `0 0 ${fallbackW} ${fallbackH}`);
    return;
  }
  const vbW = Math.max(maxX - minX + padL + padR, 440);
  const vbH = Math.max(maxY - minY + padT + padB, 400);
  const vbX = minX - padL;
  const vbY = minY - padT;
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  model.diagramViewBox = { x: vbX, y: vbY, w: vbW, h: vbH };
}

function renderDiagram() {
  const svg = els.diagram;
  svg.innerHTML = "";
  const stateIds = model.pda.states.map((s) => s.id);
  if (els.diagramEmpty) {
    els.diagramEmpty.classList.toggle("hidden", stateIds.length > 0);
  }
  if (!stateIds.length) return;

  const { w: dw, h: dh } = computeDiagramSize();
  model.layoutW = dw;
  model.layoutH = dh;
  svg.setAttribute("viewBox", `0 0 ${dw} ${dh}`);
  model.diagramViewBox = { x: 0, y: 0, w: dw, h: dh };
  els.diagramWrap?.style.setProperty("--diagram-label-px", `${Math.min(20, 15 + Math.min(6, dw / 360))}px`);

  const pos = getPos(stateIds);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L0,8 L8,4z" fill="#6b7a99"></path>
    </marker>
    <marker id="arrActive" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L0,8 L8,4z" fill="#4f8ef7"></path>
    </marker>
  `;
  svg.appendChild(defs);

  const edgeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const labelLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const nodeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.append(edgeLayer, labelLayer, nodeLayer);

  const activeTransition = model.actionPath[model.currentStep]?.transition;
  const pairCount = new Map();
  for (const t of model.pda.transitions) {
    const k = `${t.from}->${t.to}`;
    pairCount.set(k, (pairCount.get(k) || 0) + 1);
  }
  let maxParallel = 1;
  for (const c of pairCount.values()) maxParallel = Math.max(maxParallel, c);
  const m = model.pda.transitions.length;
  const offsetStep = 42 + Math.max(0, maxParallel - 2) * 12 + Math.min(18, Math.floor(m / 10));
  const pairOffsetIndex = new Map();
  const nodeR = Math.min(52, Math.round(30 + Math.min(20, dw / 220)));
  const nodePad = nodeR + 4;
  const diagramCy = dh / 2;

  model.pda.transitions.forEach((t) => {
    const a = pos[t.from], b = pos[t.to];
    if (!a || !b) return;
    const key = edgeKey(t);
    const used = model.usedEdges.has(key);
    const active = activeTransition && key === edgeKey(activeTransition);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const pairKey = `${t.from}->${t.to}`;
    const totalForPair = pairCount.get(pairKey) || 1;
    const usedForPair = pairOffsetIndex.get(pairKey) || 0;
    pairOffsetIndex.set(pairKey, usedForPair + 1);
    const offsetBase = (usedForPair - (totalForPair - 1) / 2) * offsetStep;
    let d;
    let lx;
    let ly;
    if (t.from === t.to) {
      const loopLift = 86 + usedForPair * 17 + maxParallel * 8;
      const loopSpread = 42 + usedForPair * 14 + maxParallel * 6;
      /* Arch away from the nearest viewBox edge: up if node in lower half, down if in upper half. */
      const archUp = a.y >= diagramCy;
      if (archUp) {
        d = `M ${a.x} ${a.y - nodePad} C ${a.x + loopSpread} ${a.y - loopLift}, ${a.x - loopSpread} ${a.y - loopLift}, ${a.x} ${a.y - nodePad}`;
        lx = a.x;
        ly = a.y - loopLift - 22;
      } else {
        d = `M ${a.x} ${a.y + nodePad} C ${a.x + loopSpread} ${a.y + loopLift}, ${a.x - loopSpread} ${a.y + loopLift}, ${a.x} ${a.y + nodePad}`;
        lx = a.x;
        ly = a.y + loopLift + 20;
      }
    } else {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const norm = Math.hypot(dx, dy) || 1;
      const ox = (-dy / norm) * offsetBase;
      const oy = (dx / norm) * offsetBase;
      d = `M ${a.x} ${a.y} Q ${mx + ox} ${my + oy} ${b.x} ${b.y}`;
      lx = mx + ox;
      ly = my + oy - 12 - Math.min(8, Math.abs(offsetBase) / Math.max(offsetStep, 1));
    }
    path.setAttribute("d", d);
    path.setAttribute("class", `edge${active ? " active" : ""}${used ? " used" : ""}`);
    path.setAttribute("data-key", key);
    path.setAttribute("marker-end", active ? "url(#arrActive)" : "url(#arr)");
    edgeLayer.appendChild(path);

    if (active) {
      const runner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      runner.setAttribute("r", "4");
      runner.setAttribute("fill", "#4f8ef7");
      runner.innerHTML = `<animateMotion dur=".45s" repeatCount="indefinite" path="${d}"></animateMotion>`;
      edgeLayer.appendChild(runner);
    }

    const lg = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(lx));
    label.setAttribute("y", String(ly));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "edge-label-text");

    const inputText = t.input === EPS ? "ε" : t.input;
    const labelString = `${inputText}, ${t.stackTop} / ${t.push.join("")}`;
    if (t.input === EPS) {
      label.innerHTML = `<tspan class="eps">ε</tspan><tspan>, ${escapeHtml(t.stackTop)} / ${escapeHtml(t.push.join(""))}</tspan>`;
    } else {
      label.textContent = labelString;
    }
    lg.appendChild(label);
    labelLayer.appendChild(lg);
    const box = label.getBBox();
    const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    pill.setAttribute("x", String(box.x - 6));
    pill.setAttribute("y", String(box.y - 2));
    pill.setAttribute("width", String(box.width + 12));
    pill.setAttribute("height", String(box.height + 4));
    pill.setAttribute("rx", "8");
    pill.setAttribute("class", "edge-label-pill");
    lg.insertBefore(pill, label);
  });

  const currentState = model.path[model.currentStep]?.state;
  model.pda.states.forEach((s) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const visited = model.path.some((p) => p.state === s.id);
    g.setAttribute("class", `node${s.isAccept ? " accept" : ""}${visited ? " visited" : ""}${s.id === currentState ? " active" : ""}${s.isStart ? " is-start" : ""}`);
    g.setAttribute("data-id", s.id);
    const outN = model.pda.transitions.filter((tr) => tr.from === s.id).length;
    const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    const parts = [s.id];
    if (s.isStart) parts.push("start");
    if (s.isAccept) parts.push("accept");
    tip.textContent = `${parts.join(" · ")} — ${outN} outgoing transition(s)`;
    g.appendChild(tip);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(pos[s.id].x));
    c.setAttribute("cy", String(pos[s.id].y));
    c.setAttribute("r", String(nodeR));
    g.appendChild(c);
    if (s.isAccept) {
      const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      inner.setAttribute("class", "inner");
      inner.setAttribute("cx", String(pos[s.id].x));
      inner.setAttribute("cy", String(pos[s.id].y));
      inner.setAttribute("r", String(Math.max(14, nodeR - 4)));
      g.appendChild(inner);
    }
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(pos[s.id].x));
    t.setAttribute("y", String(pos[s.id].y + 1));
    t.textContent = s.id;
    g.appendChild(t);
    nodeLayer.appendChild(g);
  });

  const start = getStartState();
  if (start && pos[start]) {
    const tail = 52 + Math.round(dw / 42);
    const tip = nodeR + 2;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", `M ${pos[start].x - tail} ${pos[start].y} L ${pos[start].x - tip} ${pos[start].y}`);
    p.setAttribute("stroke", "#4f8ef7");
    p.setAttribute("stroke-width", "2");
    p.setAttribute("fill", "none");
    p.setAttribute("marker-end", "url(#arr)");
    nodeLayer.appendChild(p);
  }

  enableDrag(svg);
  updateEdgeHoverClasses();
  applyTightViewBox(svg, [edgeLayer, labelLayer, nodeLayer], dw, dh, nodeR);
}

function enableDrag(svg) {
  let dragging = null;
  svg.onmousedown = (e) => {
    const g = e.target.closest("[data-id]");
    if (!g) return;
    dragging = g.getAttribute("data-id");
  };
  svg.onmousemove = (e) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const vb = model.diagramViewBox;
    model.positions[dragging] = {
      x: vb.x + ((e.clientX - rect.left) / rect.width) * vb.w,
      y: vb.y + ((e.clientY - rect.top) / rect.height) * vb.h,
    };
    renderDiagram();
  };
  window.onmouseup = () => {
    if (dragging) saveState();
    dragging = null;
  };
}

function renderAll() {
  renderStates();
  renderTransitions();
  renderTokens();
  renderLog();
  renderStack();
  renderResult();
  renderDiagram();
  saveState();
}

function recompute(resetStep = true) {
  model.input = els.inputString.value;
  model.resultDismissed = false;
  model._prevStackDepth = null;
  if (/[^abc()\s]/.test(model.input) && model.pda.key === "paren") flashInvalidInput();
  runBfs();
  if (resetStep) model.currentStep = 0;
  renderAll();
}

function stepForward() {
  if (model.currentStep < model.path.length - 1) {
    model.currentStep += 1;
    renderAll();
  }
}

function stepBack() {
  if (model.currentStep > 0) {
    model.currentStep -= 1;
    renderAll();
  }
}

function startAutoRun() {
  clearInterval(model.autoTimer);
  model.autoTimer = setInterval(() => {
    if (model.currentStep >= model.path.length - 1) {
      clearInterval(model.autoTimer);
      return;
    }
    stepForward();
  }, speedSliderToDelayMs(Number(els.speedSlider.value)));
}

function applySpeedUi(ms) {
  const pos = delayMsToSpeedSlider(ms);
  const clamped = Math.min(SPEED_RANGE_MAX, Math.max(SPEED_RANGE_MIN, pos));
  els.speedSlider.value = String(clamped);
  els.speedValue.textContent = `${ms}ms`;
  const edgeMs = Math.min(520, Math.max(300, Math.round(ms * 0.8)));
  document.documentElement.style.setProperty("--edge-flow-duration", `${edgeMs}ms`);
}

function setPreset(presetKey) {
  const p = presets.find((x) => x.key === presetKey) || presets[0];
  model.pda = structuredClone(p);
  model.input = p.input || "";
  els.inputString.value = model.input;
  model.positions = {};
  document.body.classList.add("preset-shimmer");
  setTimeout(() => document.body.classList.remove("preset-shimmer"), 420);
  recompute(true);
  showToast(`Loaded preset: ${p.label}`);
}

function syncThemeBtn() {
  if (!els.themeBtn) return;
  els.themeBtn.textContent = document.body.dataset.theme === "dark" ? "☀" : "🌙";
  els.themeBtn.title = document.body.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

function bind() {
  presets.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.key;
    opt.textContent = p.label;
    els.presetSelect.appendChild(opt);
  });
  els.presetSelect.addEventListener("change", () => setPreset(els.presetSelect.value));
  els.inputString.addEventListener("input", () => recompute(true));
  els.addStateBtn.addEventListener("click", () => {
    const id = `q${model.pda.states.length}`;
    model.pda.states.push({ id, name: id, isStart: model.pda.states.length === 0, isAccept: false });
    recompute();
  });
  els.addTransitionBtn.addEventListener("click", () => {
    const start = getStartState() || model.pda.states[0]?.id || "q0";
    model.pda.transitions.push({ from: start, input: EPS, stackTop: Z0, to: start, push: [Z0] });
    recompute();
  });
  els.resetBtn.addEventListener("click", () => {
    model.currentStep = 0;
    renderAll();
  });
  els.stepBtn.addEventListener("click", stepForward);
  els.backBtn.addEventListener("click", stepBack);
  els.runBtn.addEventListener("click", startAutoRun);
  els.speedSlider.addEventListener("input", () => {
    applySpeedUi(speedSliderToDelayMs(Number(els.speedSlider.value)));
    if (els.autoRunToggle.checked) startAutoRun();
  });
  els.speedBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      applySpeedUi(Number(btn.dataset.speed));
      if (els.autoRunToggle.checked) startAutoRun();
    });
  });
  els.autoRunToggle.addEventListener("change", () => {
    if (els.autoRunToggle.checked) startAutoRun();
    else clearInterval(model.autoTimer);
  });
  els.themeBtn.addEventListener("click", () => {
    document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    syncThemeBtn();
    saveState();
  });
  els.resultDismiss?.addEventListener("click", () => {
    model.resultDismissed = true;
    renderResult();
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".state-menu-dropdown").forEach((d) => {
      d.hidden = true;
    });
    document.querySelectorAll(".state-menu-trigger").forEach((b) => b.setAttribute("aria-expanded", "false"));
  });
  document.querySelectorAll(".mobile-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mobile-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      document.body.dataset.mobilePanel = tab.dataset.panel || "simulate";
      tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });
  els.exportBtn.addEventListener("click", () => {
    const data = JSON.stringify({ pda: model.pda, input: model.input }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pda-definition.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Exported JSON.");
  });
  els.importBtn.addEventListener("click", () => els.importFileInput.click());
  els.importFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.pda?.states || !parsed.pda?.transitions) throw new Error("Invalid schema");
      model.pda = parsed.pda;
      model.input = parsed.input || "";
      els.inputString.value = model.input;
      recompute(true);
      showToast("Import successful.");
    } catch {
      showToast("Import failed: invalid JSON.");
    }
  });
  els.autoLayoutBtn.addEventListener("click", () => {
    model.positions = {};
    renderDiagram();
    saveState();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); stepForward(); }
    if (e.key.toLowerCase() === "r") { model.currentStep = 0; renderAll(); }
    if (e.key === "Enter") startAutoRun();
  });
}

function init() {
  try {
    if (PROJECT_ID === "default") {
      localStorage.removeItem(LEGACY_FULL_SAVE_KEY);
    }
  } catch {
    /* ignore */
  }
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") document.body.dataset.theme = t;
  } catch {
    /* ignore */
  }
  bind();
  syncThemeBtn();
  document.querySelectorAll(".mobile-tab").forEach((t) => {
    t.classList.toggle("is-active", t.dataset.panel === document.body.dataset.mobilePanel);
  });
  els.inputString.value = model.input;
  els.presetSelect.value = model.pda.key || "anbn";
  applySpeedUi(500);
  recompute(true);
}

init();
