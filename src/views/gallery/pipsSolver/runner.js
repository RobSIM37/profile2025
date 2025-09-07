import Puzzle, { resetIdCounters } from "./src/puzzle.js";
import Board from "./src/board.js";
import Controller from "./src/controller.js";
import { solvePuzzle } from "./src/solver.js";
import Sidebar from "./src/sidebar.js";
import BoardToolsPanel from "./src/panels/boardToolsPanel.js";
import AreasPanel from "./src/panels/areasPanel.js";
import DominoesPanel from "./src/panels/dominoesPanel.js";
import { Modes } from "./src/constants.js";

export function mountPipsSolver(target) {
  if (!target) throw new Error('mountPipsSolver: target required');

  // Header
  const header = document.createElement("header");
  header.className = "pips-header";
  const h1 = document.createElement("h1");
  h1.className = "pips-title";
  h1.textContent = "Pips Solver";
  const sub = document.createElement("div");
  sub.className = "pips-subtitle";
  sub.textContent = "Place dominoes to satisfy area rules.";
  header.append(h1, sub);
  target.append(header);

  // Layout containers
  const layout = document.createElement("div");
  layout.className = "pips-layout";
  const boardWrap = document.createElement("div");
  boardWrap.className = "pips-board-wrap";
  const sidebarMount = document.createElement("div");
  layout.append(boardWrap, sidebarMount);
  target.append(layout);

  // Defaults
  let GRID = { width: 8, height: 8, cellSize: 48 };

  // Instances
  let puzzle = new Puzzle(GRID);
  let board  = new Board(GRID);
  board.mount(boardWrap);
  board.render(puzzle);

  let sidebar = new Sidebar({
    onModeChange: (mode)=> controller.setMode(mode),
    onSolve: handleSolve,
    onReset: handleReset
  });
  sidebar.mount(sidebarMount);

  let controller = new Controller({
    puzzle,
    board,
    onModeChanged: ()=> sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID }),
    onHint: (msg) => sidebar.toast(msg),
  });
  controller.setMode(sidebar.mode);

  // Panels
  const boardPanel = new BoardToolsPanel({
    onClearAll: () => { board.clearSolution(); puzzle.clearAll(); board.render(puzzle); sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID }); },
    onFillAll:  () => { board.clearSolution(); puzzle.setAllAvailable(true); board.render(puzzle); sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID }); },
    onApplyGrid: ({ width, height, cellSize }) => applyGridResize({ width, height, cellSize }),
  });

  const areasPanel = new AreasPanel({
    onAddArea: ({ color, rule }) => {
      board.clearSolution();
      const area = puzzle.addArea({ color, rule });
      controller.setActiveArea(area.id);
      board.render(puzzle);
      sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
      sidebar.toast("Area added.");
    },
    onRemoveArea: (id) => {
      if (!id) return;
      board.clearSolution();
      puzzle.removeArea(id);
      if (controller.activeAreaId === id) controller.setActiveArea(null);
      board.render(puzzle);
      sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
    },
    onClearAllAreas: () => {
      board.clearSolution();
      puzzle.listAreas().forEach(a => puzzle.removeArea(a.id));
      controller.setActiveArea(null);
      board.render(puzzle);
      sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
    },
    onSelectArea: (id) => {
      controller.setActiveArea(id);
      sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
    },
  });

  const domPanel = new DominoesPanel({
    onAddDominoes: (pairs) => {
      pairs.forEach(([a,b]) => puzzle.addDomino(a,b));
      board.clearSolution();
      sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
      sidebar.toast(`Added ${pairs.length} domino(es).`);
    },
    onRemoveDomino: (id) => {
      puzzle.removeDomino(id);
      board.clearSolution();
      sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
    },
    onClearDominoes: () => {
      puzzle.dominos.slice().forEach(d => puzzle.removeDomino(d.id));
      board.clearSolution();
      sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
    },
  });

  sidebar.setPanels({
    [Modes.DefineBoard]: boardPanel,
    [Modes.DefineArea]: areasPanel,
    [Modes.AddDomino]: domPanel,
  });
  sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });

  // handlers
  function handleSolve() {
    board.render(puzzle);
    const res = solvePuzzle(puzzle);
    if (!res.success) {
      sidebar.toast(res.error || "No solution found.");
      board.clearSolution();
      return;
    }
    board.setSolution(res.cellValues);
    board.setPlacements(res.placements);
    sidebar.toast("Solved!");
  }

  function handleReset() {
    board.clearSolution();
    puzzle.clearAll();
    puzzle.listAreas().forEach(a => puzzle.removeArea(a.id));
    puzzle.dominos.slice().forEach(d => puzzle.removeDomino(d.id));
    controller.setActiveArea(null);
    board.render(puzzle);
    sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
    sidebar.toast("Puzzle reset.");
    // Reset ID counters for areas/dominoes and return to the first step panel
    resetIdCounters();
    // Switch UI to the first-step panel and sync controller via sidebar
    sidebar.setMode(Modes.DefineBoard);
  }

  function applyGridResize({ width, height, cellSize }) {
    GRID = { width, height, cellSize };
    board.clearSolution();
    boardWrap.innerHTML = "";
    puzzle = new Puzzle(GRID);
    board  = new Board(GRID);
    board.mount(boardWrap);
    board.render(puzzle);
    controller = new Controller({
      puzzle,
      board,
      onModeChanged: () => sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID }),
      onHint: (msg) => sidebar.toast(msg),
    });
    controller.setMode(sidebar.mode);
    sidebar.renderPanels({ puzzle, activeAreaId: controller.activeAreaId, grid: GRID });
    sidebar.toast(`Resized to ${width} × ${height} (cell ${cellSize}px).`);
  }

  return { destroy: ()=> { target.innerHTML = ''; } };
}
