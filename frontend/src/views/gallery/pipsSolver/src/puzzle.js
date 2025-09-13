let NEXT_AREA_ID = 1;
let NEXT_DOM_ID = 1;

export default class Puzzle {
  constructor({ width=8, height=8 } = {}) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => ({ x, y, available: false, areaId: null }))
    );
    this.areas = [];   // { id, color, rule }
    this.dominos = []; // { id, a, b }
  }

  getCell(x, y) {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) return null;
    return this.cells[y][x];
  }

  setAllAvailable(next=true) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x].available = !!next;
      }
    }
  }

  clearAll() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const c = this.cells[y][x];
        c.available = false;
        c.areaId = null;
      }
    }
  }

  listAreas() { return this.areas.slice(); }
  getArea(id) { return this.areas.find(a => a.id === id) || null; }
  addArea({ color, rule }) {
    const a = { id: String(NEXT_AREA_ID++), color, rule };
    this.areas.push(a); return a;
  }
  removeArea(id) {
    const idx = this.areas.findIndex(a => a.id === id);
    if (idx >= 0) this.areas.splice(idx, 1);
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) if (this.cells[y][x].areaId === id) this.cells[y][x].areaId = null;
  }

  addDomino(a, b){
    this.dominos.push({ id:String(NEXT_DOM_ID++), a, b });
  }
  removeDomino(id){
    const i = this.dominos.findIndex(d => d.id === id);
    if (i>=0) this.dominos.splice(i,1);
  }
}

// Reset module-level ID counters so a fresh puzzle starts at 1 again.
export function resetIdCounters(){
  NEXT_AREA_ID = 1;
  NEXT_DOM_ID = 1;
}
