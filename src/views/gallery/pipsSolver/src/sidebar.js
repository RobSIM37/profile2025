import { Modes } from "./constants.js";
import { el, btn, primaryBtn, makeHinter } from "./utils/ui.js";
import { makeTabs } from "../../../../components/ui/tabs.js";

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
    this._tabs = null;
  }

  mount(container){
    const root = el('aside', null, 'pips-sidebar');
    const wrap = el('div', null, 'panel');
    const footer = el('div', null, 'sidebar-footer');

    // Shared Tabs header (extracted)
    const items = [
      { id: Modes.DefineBoard, label: Modes.DefineBoard },
      { id: Modes.DefineArea,  label: Modes.DefineArea },
      { id: Modes.AddDomino,   label: Modes.AddDomino },
    ];
    const tabs = makeTabs({ items, activeId: this.mode, onChange: (id) => this.setMode(id) });

    root.append(tabs.root, wrap, footer);
    container.innerHTML = '';
    container.append(root);
    this.root = root;
    this._panelWrap = wrap;
    this._tabs = tabs;
  }

  setHintEl(el){
    this._hint = el || null;
  }

  setMode(mode){
    this.mode = mode; this.onModeChange?.(mode);
    // sync header tabs
    this._tabs?.setActive?.(this.mode, false);
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
