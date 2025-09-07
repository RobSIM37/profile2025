import { el, btn, input, renderDominoTile, parseDominoInput } from "../utils/ui.js";

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
    c.append(el('h3','Dominoes'));

    const add = el('div', null, 'section');
    add.append(el('h4','Add'));
    const ip = input('text','Pairs', '');
    this._input = ip.input;
    this._input.placeholder = 'e.g. 06,23,5 ,0 ';
    const addBtn = btn('Add', ()=>{
      const { valid } = parseDominoInput(this._input.value);
      if (valid.length) this.onAddDominoes?.(valid);
    });
    add.append(ip.wrapper, addBtn);
    c.append(add);

    const listWrap = el('div', null, 'section');
    listWrap.append(el('h4','Existing'));
    const rack = el('div', null, 'rack');
    (puzzle?.dominos || []).forEach(d => {
      const row = el('div', null, 'rack-item');
      row.append(renderDominoTile(d.a,d.b), btn('Remove', ()=> this.onRemoveDomino?.(d.id)));
      rack.append(row);
    });
    listWrap.append(rack);
    const clearBtn = btn('Clear All', ()=> this.onClearDominoes?.());
    c.append(listWrap, clearBtn);
  }
}
