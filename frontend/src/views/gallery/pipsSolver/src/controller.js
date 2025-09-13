import { Modes } from "./constants.js";

export default class Controller {
  constructor({ puzzle, board, onModeChanged, onHint } = {}) {
    this.puzzle = puzzle;
    this.board = board;
    this.onModeChanged = onModeChanged || (()=>{});
    this.onHint = onHint || (()=>{});

    this.mode = Modes.DefineBoard;
    this.activeAreaId = null;

    this.isPainting = false;
    this.paintAvailTo = null;

    this.board.setCallbacks?.({
      onCellMouseDown: (x,y,e)=> this.onCellMouseDown(x,y,e),
      onCellMouseEnter: (x,y,e)=> this.onCellMouseEnter(x,y,e),
      onMouseUp: (e)=> this.onMouseUp(e),
    });
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.onModeChanged?.(mode);
  }

  setActiveArea(id) { this.activeAreaId = id || null; }

  onCellMouseDown(x,y,_e){
    const cell = this.puzzle.getCell(x,y);
    if (!cell) return;
    this.isPainting = true;

    if (this.mode === Modes.DefineBoard) {
      this.paintAvailTo = !cell.available;
      this.applyBoardPaint(x,y);
      return;
    }
    if (this.mode === Modes.DefineArea) {
      if (!this.activeAreaId) { this.onHint?.("Select an area to paint."); return; }
      this.applyAreaPaint(x,y);
      return;
    }
  }

  onCellMouseEnter(x,y,_e){
    if (!this.isPainting) return;
    if (this.mode === Modes.DefineBoard) this.applyBoardPaint(x,y);
    else if (this.mode === Modes.DefineArea) this.applyAreaPaint(x,y);
  }

  onMouseUp(_e){ this.isPainting = false; this.paintAvailTo = null; }

  applyBoardPaint(x,y){
    const cell = this.puzzle.getCell(x,y);
    if (!cell) return;
    const next = this.paintAvailTo;
    if (typeof next !== "boolean") return;
    if (cell.available === next) return;
    cell.available = next;
    this.board.clearSolution?.();
    this.board.render(this.puzzle);
  }

  applyAreaPaint(x,y){
    const cell = this.puzzle.getCell(x,y);
    if (!cell || !cell.available) return;
    if (cell.areaId === this.activeAreaId) return;
    cell.areaId = this.activeAreaId;
    this.board.clearSolution?.();
    this.board.render(this.puzzle);
  }
}

