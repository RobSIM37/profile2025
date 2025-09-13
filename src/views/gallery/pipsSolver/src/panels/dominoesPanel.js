import { el, btn, renderDominoTile, parseDominoInput } from "../utils/ui.js";
import { textField } from "../../../../../components/ui/inputs.js";

export default class DominoesPanel {
  constructor({ onAddDominoes, onRemoveDomino, onClearDominoes } = {}){
    this.onAddDominoes = onAddDominoes || (()=>{});
    this.onRemoveDomino = onRemoveDomino || (()=>{});
    this.onClearDominoes = onClearDominoes || (()=>{});
    this.root = null;
    this._input = null;
  }

  mount(container){ this.root = container; this.render({ puzzle:null }); }

  render({ puzzle }){
    const c = this.root; c.innerHTML = '';

    const add = el('div', null, 'section');
    const ip = textField({ label: 'Pairs', value: '' });
    this._input = ip.input;
    this._input.placeholder = 'e.g. 06,23,5 ,0 ';
    const addFromInput = ()=>{
      const { valid } = parseDominoInput(this._input.value);
      if (valid.length) this.onAddDominoes?.(valid);
    };
    const addBtn = btn('Add', addFromInput);
    // Focus the input when this panel is shown and submit on Enter
    queueMicrotask(()=> this._input?.focus());
    this._input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') { e.preventDefault(); addFromInput(); }
    });
    add.append(ip.wrapper, addBtn);
    c.append(add);

    const doms = puzzle?.dominos || [];
    if (doms.length > 0) {
      const listWrap = el('div', null, 'section');
      listWrap.append(el('h4','Existing'));
      const rack = el('div', null, 'rack');
      doms.forEach(d => {
        const row = el('div', null, 'rack-item');
        row.append(renderDominoTile(d.a,d.b), btn('Remove', ()=> this.onRemoveDomino?.(d.id)));
        rack.append(row);
      });
      listWrap.append(rack);
      if (doms.length >= 2) {
        const clearBtn = btn('Clear All', ()=> this.onClearDominoes?.());
        c.append(listWrap, clearBtn);
      } else {
        c.append(listWrap);
      }
    }
  }
}
