import { el, btn, input } from "../utils/ui.js";

export default class BoardToolsPanel {
  constructor({ onClearAll, onFillAll, onApplyGrid } = {}) {
    this.onClearAll = onClearAll || (()=>{});
    this.onFillAll = onFillAll || (()=>{});
    this.onApplyGrid = onApplyGrid || (()=>{});
    this.root = null;
    this._w = null; this._h = null; this._cs = null;
  }

  mount(container){ this.root = container; this.render({ puzzle: null, grid: { width: 8, height: 8, cellSize: 48 } }); }

  render({ puzzle, grid }){
    const c = this.root; c.innerHTML = "";
    c.append(el("h3","Board Tools"));
    const size = el("div", null, "section");
    size.append(el("h4","Board Size"));
    const wi = input("number","Width", String(grid?.width ?? 8));
    const hi = input("number","Height", String(grid?.height ?? 8));
    const ci = input("number","Cell px", String(grid?.cellSize ?? 48));
    this._w = wi.input; this._h = hi.input; this._cs = ci.input;
    this._w.min="1"; this._h.min="1"; this._cs.min="24";
    this._w.max="24"; this._h.max="24"; this._cs.max="96";
    const apply = btn("Apply Size", ()=>{
      const width  = clampInt(this._w.value, 1, 24, 8);
      const height = clampInt(this._h.value, 1, 24, 8);
      const cs     = clampInt(this._cs.value, 24, 96, 48);
      this.onApplyGrid({ width, height, cellSize: cs });
    });
    size.append(wi.wrapper, hi.wrapper, ci.wrapper, apply);

    const row = el("div", null, "row");
    row.append(btn("Clear All", this.onClearAll), btn("Fill All", this.onFillAll));
    c.append(size, row);
  }
}

function clampInt(v, min, max, fallback){
  const n = Math.round(Number(v));
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return fallback;
}
