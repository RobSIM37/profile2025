export default class Board {
  constructor({ width = 8, height = 8, cellSize = 48, callbacks = {} } = {}) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.gap = 4;
    this.callbacks = callbacks;

    this.stage = null;
    this.root = null;
    this.cellEls = [];
    this.slots = []; // [y][x] -> { c,t,r,b,l, tl,tr,bl,br }
    this.solutionValues = null;
  }

  setCallbacks(cb) { this.callbacks = cb || {}; }

  mount(container) {
    if (!container) throw new Error("No container for Board.mount");
    this.#ensureStyles();

    const stage = document.createElement("div");
    stage.className = "pips-stage";
    stage.style.position = "relative";
    stage.style.width  = `${this.width * this.cellSize + (this.width - 1) * this.gap}px`;
    stage.style.height = `${this.height * this.cellSize + (this.height - 1) * this.gap}px`;

    const root = document.createElement("div");
    root.className = "pips-board";
    root.style.display = "grid";
    root.style.gridTemplateColumns = `repeat(${this.width}, ${this.cellSize}px)`;
    root.style.gridAutoRows = `${this.cellSize}px`;
    root.style.gap = `${this.gap}px`;
    root.style.userSelect = "none";

    this.cellEls = [];
    this.slots = [];

    for (let y = 0; y < this.height; y++) {
      const row = [];
      const rowSlots = [];
      for (let x = 0; x < this.width; x++) {
        const cell = document.createElement("div");
        cell.className = "pips-cell out-puzzle";
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.style.width = `${this.cellSize}px`;
        cell.style.height = `${this.cellSize}px`;

        const mk = (cls) => { const d = document.createElement("div"); d.className = `slot ${cls}`; return d; };
        const tl = mk("tl"),  t = mk("t"),  tr = mk("tr");
        const l  = mk("l"),   c = mk("c"),  r  = mk("r");
        const bl = mk("bl"),  b = mk("b"),  br = mk("br");
        cell.append(tl, t, tr, l, c, r, bl, b, br);

        cell.addEventListener("mousedown", (e) => { e.preventDefault(); this.callbacks?.onCellMouseDown?.(x, y, e); });
        cell.addEventListener("mouseenter", (e) => { this.callbacks?.onCellMouseEnter?.(x, y, e); });

        row.push(cell);
        rowSlots.push({ c,t,r,b,l,tl,tr,bl,br });
        root.appendChild(cell);
      }
      this.cellEls.push(row);
      this.slots.push(rowSlots);
    }

    window.addEventListener("mouseup", (e) => this.callbacks?.onMouseUp?.(e));

    container.innerHTML = "";
    stage.appendChild(root);
    container.appendChild(stage);
    this.stage = stage;
    this.root = root;
  }

  render(puzzle) {
    if (!this.root) return;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) this.#paintCell(puzzle, x, y);
    }
    if (this.solutionValues) this.#updateSolutionNumbers();
  }

  setSolution(valuesMap) {
    this.solutionValues = valuesMap;
    this.#updateSolutionNumbers();
  }

  clearSolution() {
    this.solutionValues = null;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const center = this.slots[y]?.[x]?.c;
        const cell = this.cellEls[y]?.[x];
        if (cell) cell.classList.remove("has-solution");
        if (center) center.textContent = "";
      }
    }
    this.setPlacements(null);
  }

  #updateSolutionNumbers() {
    const sol = this.solutionValues;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const k = `${x},${y}`;
        const center = this.slots[y]?.[x]?.c;
        const cell = this.cellEls[y]?.[x];
        if (!center || !cell) continue;
        if (sol && sol.has(k)) {
          const v = sol.get(k) ?? 0;
          cell.classList.add("has-solution");
          center.textContent = v === 0 ? "" : String(v);
        } else {
          cell.classList.remove("has-solution");
          center.textContent = "";
        }
      }
    }
  }

  setPlacements(placements) {
    const off = (x,y) => {
      const s = this.slots[y]?.[x]; if (!s) return;
      s.t.classList.remove("on"); s.r.classList.remove("on");
      s.b.classList.remove("on"); s.l.classList.remove("on");
    };
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) off(x,y);

    if (!placements || !placements.length) return;

    const on = (x,y,which) => {
      const s = this.slots[y]?.[x]; if (!s) return;
      if (which === "t") s.t.classList.add("on");
      if (which === "r") s.r.classList.add("on");
      if (which === "b") s.b.classList.add("on");
      if (which === "l") s.l.classList.add("on");
    };

    for (const p of placements) {
      const [ax, ay] = p.aKey.split(",").map(Number);
      const [bx, by] = p.bKey.split(",").map(Number);
      if (ay === by) {
        const x0 = Math.min(ax,bx);
        const x1 = Math.max(ax,bx);
        const y = ay;
        on(x0,y,"l"); on(x1,y,"r");
        on(x0,y,"t"); on(x1,y,"t");
        on(x0,y,"b"); on(x1,y,"b");
      } else if (ax === bx) {
        const x = ax;
        const y0 = Math.min(ay,by);
        const y1 = Math.max(ay,by);
        on(x,y0,"t"); on(x,y1,"b");
        on(x,y0,"l"); on(x,y1,"l");
        on(x,y0,"r"); on(x,y1,"r");
      }
    }
  }

  #paintCell(puzzle, x, y) {
    const el = this.cellEls[y]?.[x];
    if (!el) return;
    const cell = puzzle.getCell(x, y);
    if (!cell) return;

    el.classList.toggle("in-puzzle", !!cell.available);
    el.classList.toggle("out-puzzle", !cell.available);

    const area = cell.areaId ? puzzle.getArea(cell.areaId) : null;
    const inArea = !!area && !!cell.available;
    el.classList.toggle("in-area", inArea);
    if (inArea) {
      el.style.setProperty("--area-color", area.color || "tan");
      // show the Area # in the top-left corner in the area's color
      const s = this.slots[y]?.[x];
      if (s?.tl) s.tl.textContent = String(area.id);
    } else {
      el.style.removeProperty("--area-color");
      const s = this.slots[y]?.[x];
      if (s?.tl) s.tl.textContent = "";
    }
  }

  #ensureStyles() {
    const existing = document.getElementById("pips-board-styles");
    if (existing) existing.remove();
    const style = document.createElement("style");
    style.id = "pips-board-styles";
    style.textContent = `
      .pips-board { touch-action: none; }
      .pips-cell {
        box-sizing: border-box;
        border: 1px solid #ccc;
        border-radius: 6px;
        display: grid;
        grid-template-columns: var(--line,3px) 1fr var(--line,3px);
        grid-template-rows:    var(--line,3px) 1fr var(--line,3px);
        grid-template-areas:
          "tl t tr"
          "l  c r"
          "bl b br";
        cursor: crosshair;
        transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        font-family: system-ui, sans-serif;
        color: #222;
        background-clip: padding-box;
        place-items: stretch;
      }
      .pips-cell.out-puzzle { background: #fff; border: 1px solid #bbb; }
      .pips-cell.in-puzzle  { background: tan; border: 1px solid #996; }
      .pips-cell.in-puzzle.in-area {
        background: tan;
        border-color: var(--area-color, #996);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--area-color, #996) 45%, #ffffff 55%);
      }
      .pips-cell.in-puzzle.has-solution { background: #fff; }

      .pips-cell .slot { pointer-events: none; }
      .pips-cell .slot.tl { grid-area: tl; }
      .pips-cell .slot.t  { grid-area: t;  }
      .pips-cell .slot.tr { grid-area: tr; }
      .pips-cell .slot.l  { grid-area: l;  }
      .pips-cell .slot.c  { grid-area: c; display: grid; place-items: center; font-weight: 700; }
      .pips-cell .slot.r  { grid-area: r;  }
      .pips-cell .slot.bl { grid-area: bl; }
      .pips-cell .slot.b  { grid-area: b;  }
      .pips-cell .slot.br { grid-area: br; }

      /* Area badge (Area #) in the top-left corner */
      .pips-cell .slot.tl {
        align-self: start;
        justify-self: start;
        font-size: 12px;
        line-height: 1;
        padding: 2px 0 0 3px;
        color: var(--area-color, #996);
        font-weight: 800;
        text-shadow: 0 1px 1px rgba(0,0,0,0.35);
      }

      .pips-cell .slot.t.on,
      .pips-cell .slot.r.on,
      .pips-cell .slot.b.on,
      .pips-cell .slot.l.on {
        background: #000; border-radius: 2px;
      }
    `;
    document.head.appendChild(style);
  }
}
