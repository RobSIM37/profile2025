import { PALETTE } from "../constants.js";
import { el, btn, input, select, labelWrap, ruleLabel } from "../utils/ui.js";

export default class AreasPanel {
  constructor({ onAddArea, onRemoveArea, onClearAllAreas, onSelectArea } = {}) {
    this.onAddArea = onAddArea || (()=>{});
    this.onRemoveArea = onRemoveArea || (()=>{});
    this.onClearAllAreas = onClearAllAreas || (()=>{});
    this.onSelectArea = onSelectArea || (()=>{});
    this.root = null;
    this._selectedColor = PALETTE[2];
    this._ruleKind = "AllSame";
    this._targetVal = 10;
  }

  mount(container){ this.root = container; this.render({ puzzle: null, activeAreaId: null }); }

  render({ puzzle, activeAreaId }){
    const c = this.root; c.innerHTML = "";

    const add = el("div", null, "section");
    const ruleSel = select("Rule",[
      ["AllSame","All pips equal"],
      ["AllDiff","All pips different"],
      ["SumEq","Sum = target"],
      ["SumLt","Sum < target"],
      ["SumGt","Sum > target"],
    ]);
    ruleSel.input.value = this._ruleKind;
    const target = input("number","Target", String(this._targetVal));
    const syncTargetVis = ()=> target.wrapper.style.display = this._ruleKind.startsWith("Sum") ? "" : "none";
    syncTargetVis();

    ruleSel.input.addEventListener("change", ()=> { this._ruleKind = ruleSel.input.value; syncTargetVis(); });
    target.input.addEventListener("input", ()=>{
      const n = Number(target.input.value); if (Number.isFinite(n)) this._targetVal = n;
    });

    // Color palette moved below rule/target, and clicking a color adds the area
    const paletteWrap = el("div", null, "palette");
    PALETTE.forEach(hex => {
      const sw = el("button", null, "color");
      sw.style.background = hex;
      if (this._selectedColor === hex) sw.classList.add("is-selected");
      sw.addEventListener("click", ()=>{
        this._selectedColor = hex;
        // Visual selection update
        [...paletteWrap.children].forEach(ch => ch.classList.remove("is-selected"));
        sw.classList.add("is-selected");
        // Add area immediately using current rule/target
        const kind = this._ruleKind;
        const rule = kind.startsWith("Sum") ? { kind, target: Number(this._targetVal) } : { kind };
        this.onAddArea({ color: this._selectedColor, rule });
      });
      paletteWrap.append(sw);
    });

    add.append(ruleSel.wrapper, target.wrapper, labelWrap("Color", paletteWrap));
    c.append(add);

    const listWrap = el("div", null, "section");
    if (((puzzle?.listAreas()?.length) || 0) > 0) listWrap.append(el("h4","Existing"));
    const list = el("div");
    const areas = puzzle ? puzzle.listAreas() : [];
    areas.forEach(a => {
      const row = el("div", null, "area-item");
      const left = el("div", null, "area-left");
      const radio = document.createElement("input");
      radio.type="radio"; radio.name="active-area"; radio.value=a.id; radio.checked = a.id === activeAreaId;
      radio.addEventListener("change", ()=> this.onSelectArea?.(a.id));
      const sw = el("span", null, "swatch"); sw.style.background = a.color || 'tan';
      const label = el("span", `Area ${a.id} — ${ruleLabel(a.rule)}`);
      left.append(radio, sw, label);
      const remove = btn("Remove", ()=> this.onRemoveArea?.(a.id));
      row.append(left, remove);
      list.append(row);
    });
    listWrap.append(list);
    const clear = btn("Clear All", ()=> this.onClearAllAreas?.());
    if ((areas?.length || 0) >= 2) {
      c.append(listWrap, clear);
    } else if ((areas?.length || 0) === 1) {
      c.append(listWrap);
    }
  }
}
