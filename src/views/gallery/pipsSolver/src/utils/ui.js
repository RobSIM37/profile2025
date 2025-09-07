export function ensureBaseStyles() {
  const prev = document.getElementById("pips-base-styles");
  if (prev) prev.remove();
  const style = document.createElement("style");
  style.id = "pips-base-styles";
  style.textContent = `
    :root{
      --sidebar-width: 420px;
      --area-item-left-width: 240px;
    }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .pips-header { display: grid; justify-items: center; margin: 12px 0 8px; }
    .pips-title { margin: 0; font-weight: 800; letter-spacing: .2px; font-size: clamp(1.6rem, 1.2rem + 1.2vw, 2.1rem); }
    .pips-subtitle { margin: 4px 0 0; color: #666; font-size: 13px; }

    .pips-layout { display: flex; justify-content: center; align-items: flex-start; gap: 24px; padding: 0 12px 24px; }
    .pips-board-wrap { flex: 0 0 auto; }

    .pips-sidebar {
      width: var(--sidebar-width);
      border: 1px solid #ddd; border-radius: 8px; padding: 12px;
      display: flex; flex-direction: column; gap: 12px; background: #fff;
    }

    .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .pips-tab { padding: 6px 10px; border: 1px solid #ccc; background: #f7f7f7; border-radius: 6px; cursor: pointer; }
    .pips-tab.is-active { background: #eaeaea; border-color: #bbb; font-weight: 600; }

    .panel { display: grid; gap: 8px; flex: 1; }
    .sidebar-footer { margin-top: auto; display: grid; gap: 8px; }

    .row { display: flex; gap: 8px; align-items: center; }
    .section { display: grid; gap: 6px; }

    .pips-button {
      padding: 6px 10px; border: 1px solid #ccc; background: #fff; border-radius: 6px; cursor: pointer;
      transition: background 120ms ease, filter 120ms ease, transform 40ms ease;
    }
    .pips-button:not(.pips-primary):hover { background: #f0f0f0; }

    .pips-primary { border: 1px solid #222; background: #111; color: #fff; border-radius: 8px; font-weight: 700; }
    .pips-primary:hover, .pips-primary:focus { background: #111; filter: brightness(1.08); }
    .pips-primary:active { background: #0e0e0e; transform: translateY(1px); }
    .pips-primary:focus-visible { outline: 2px solid #4c9ffe; outline-offset: 2px; }

    .pips-input { padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; flex: 1; }

    .pips-field { display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 6px; }
    .pips-label { color: #555; font-size: 12px; }
    .pips-control > * { width: 100%; }

    .hint { opacity: 0; transition: opacity 200ms ease; color: #444; font-size: 12px; }
    .hint.is-visible { opacity: 1; }

    hr { border: none; border-top: 1px solid #eee; margin: 6px 0; }

    .palette { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .color { width: 100%; aspect-ratio: 2/1; border-radius: 6px; border: 2px solid rgba(0,0,0,0.25); cursor: pointer; background: #fff; }
    .color.is-selected { outline: 2px solid #000; outline-offset: 2px; }

    .swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid #666; vertical-align: middle; margin: 0 6px; }

    .note { color: #666; font-size: 12px; }
    .rack { display: grid; gap: 8px; grid-template-columns: 1fr; }
    .rack-item { display: flex; align-items: center; gap: 8px; width: 100%; }
    .rack-item > .pips-button { margin-left: auto; }

    .pips-domino { display: inline-grid; grid-auto-flow: column; gap: 2px; border: 3px solid #000; border-radius: 8px; padding: 0; background: transparent; }
    .pips-domino-half {
      display: grid; place-items: center; background: #fff; border: 1px solid #bbb; border-radius: 6px;
      font-weight: 700; color: #222; font-family: system-ui, sans-serif; user-select: none;
      width: 48px; height: 48px;
    }

    /* Areas list row alignment */
    .area-item { display: flex; align-items: center; gap: 8px; width: 100%; }
    .area-left { display: flex; align-items: center; gap: 6px;
      flex: 0 0 var(--area-item-left-width); max-width: var(--area-item-left-width);
      min-width: var(--area-item-left-width); overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    }
    .area-item > .pips-button { margin-left: auto; }
  `;
  document.head.appendChild(style);
}

export function el(tag, text=null, cls=null) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== null && text !== undefined) d.textContent = text;
  return d;
}

export function btn(label, onclick) {
  const b = document.createElement("button");
  b.className = "pips-button";
  b.textContent = label;
  if (onclick) b.addEventListener("click", onclick);
  return b;
}

export function primaryBtn(label, onclick) {
  const b = btn(label, onclick);
  b.classList.add("pips-primary");
  return b;
}

export function input(type, labelText, defaultValue="") {
  const wrapper = el("div", null, "pips-field");
  const label = el("div", labelText, "pips-label");
  const control = el("div", null, "pips-control");
  const input = document.createElement("input");
  input.type = type;
  input.value = defaultValue;
  control.append(input);
  wrapper.append(label, control);
  return { wrapper, input };
}

export function select(labelText, options) {
  const wrapper = el("div", null, "pips-field");
  const label = el("div", labelText, "pips-label");
  const control = el("div", null, "pips-control");
  const sel = document.createElement("select");
  for (const [value, text] of options) {
    const o = document.createElement("option");
    o.value = value; o.textContent = text;
    sel.append(o);
  }
  control.append(sel);
  wrapper.append(label, control);
  return { wrapper, input: sel };
}

export function labelWrap(labelText, node) {
  const wrapper = el("div", null, "pips-field");
  const label = el("div", labelText, "pips-label");
  const control = el("div", null, "pips-control");
  control.append(node);
  wrapper.append(label, control);
  return wrapper;
}

export function ruleLabel(rule) {
  if (!rule) return "(no rule)";
  if (rule.kind === "AllSame") return "All pips equal";
  if (rule.kind === "AllDiff") return "All pips different";
  if (rule.kind === "SumEq")   return `Sum = ${rule.target}`;
  if (rule.kind === "SumLt")   return `Sum < ${rule.target}`;
  if (rule.kind === "SumGt")   return `Sum > ${rule.target}`;
  return "(unknown rule)";
}

export function renderDominoTile(a, b, cellSize=48) {
  const wrap = el("div", null, "pips-domino");
  const h1 = el("div", (a===0 ? "" : String(a)), "pips-domino-half");
  const h2 = el("div", (b===0 ? "" : String(b)), "pips-domino-half");
  // size each half based on cellSize
  h1.style.width = h2.style.width = `${cellSize}px`;
  h1.style.height = h2.style.height = `${cellSize}px`;
  wrap.append(h1, h2);
  return wrap;
}

export function parseDominoInput(str) {
  const valid = [];
  const invalid = [];
  if (!str) return { valid, invalid };
  const tokens = str.split(",").map(s => s.trim());
  for (const tok of tokens) {
    if (tok.length !== 2) { if (tok) invalid.append(tok); continue; }
    const mapChar = (ch) => (ch === " " || ch === "0") ? 0 : (/^[1-6]$/.test(ch) ? Number(ch) : null);
    const a = mapChar(tok[0]);
    const b = mapChar(tok[1]);
    if (a === null || b === null) { invalid.push(tok); continue; }
    valid.push([a,b]);
  }
  return { valid, invalid };
}

export function makeHinter(elm) {
  return (msg) => {
    if (!elm) return;
    elm.textContent = msg || "";
    elm.classList.add("is-visible");
    setTimeout(() => elm.classList.remove("is-visible"), 1800);
  };
}

