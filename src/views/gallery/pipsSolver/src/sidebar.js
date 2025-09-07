import { Modes } from "./constants.js";
import { el, btn, primaryBtn, makeHinter } from "./utils/ui.js";

export default class Sidebar {
  constructor({ onModeChange, onSolve, onReset } = {}){
    this.onModeChange = onModeChange || (()=>{});
    this.onSolve = onSolve || (()=>{});
    this.onReset = onReset || (()=>{});
    this.mode = Modes.DefineBoard;
    this.root = null;
    this._panels = {};
    this._panelWrap = null;
    this._hint = null;
    this._ctx = null;
  }

  mount(container){
    const root = el('aside', null, 'pips-sidebar');
    const tabs = el('div', null, 'tabs');
    const wrap = el('div', null, 'panel');
    const footer = el('div', null, 'sidebar-footer');
    const hint = el('div', '', 'hint');
    footer.append(hint);
    this._hint = hint;

    const mkTab = (label, mode) => {
      const b = el('button', label, 'pips-tab');
      if (this.mode === mode) b.classList.add('is-active');
      b.addEventListener('click', ()=>{ this.setMode(mode); });
      tabs.append(b);
    };
    mkTab(Modes.DefineBoard, Modes.DefineBoard);
    mkTab(Modes.DefineArea, Modes.DefineArea);
    mkTab(Modes.AddDomino, Modes.AddDomino);

    const solveBtn = primaryBtn('Solve', ()=> this.onSolve?.());
    const resetBtn = btn('Reset', ()=> this.onReset?.());
    footer.append(solveBtn, resetBtn);

    root.append(tabs, wrap, footer);
    container.innerHTML = '';
    container.append(root);
    this.root = root;
    this._panelWrap = wrap;
  }

  setMode(mode){
    this.mode = mode; this.onModeChange?.(mode);
    // update tabs
    const is = (label)=> label === mode;
    this.root?.querySelectorAll('.pips-tab')?.forEach(b => {
      b.classList.toggle('is-active', is(b.textContent));
    });
    this.renderPanels(this._ctx || {});
  }

  setPanels(map){ this._panels = map || {}; }

  renderPanels({ puzzle, activeAreaId, grid }){
    // persist latest non-undefined context
    const incoming = { puzzle, activeAreaId, grid };
    this._ctx = { ...(this._ctx || {}), ...Object.fromEntries(Object.entries(incoming).filter(([,v]) => v !== undefined)) };
    const p = this._panels[this.mode];
    const w = this._panelWrap; if (!w) return;
    if (p) {
      p.mount(w);
      p.render(this._ctx);
    } else {
      w.textContent = '';
    }
  }

  toast(msg){
    makeHinter(this._hint)?.(msg);
  }
}
