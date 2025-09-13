import { Button } from '../../../components/ui/button.js';
import { setAppSolid } from '../../../lib/appShell.js';
import { makeTimer } from '../../../lib/timers.js';

export const meta = {
  title: 'Snake+ — Game',
  description: 'Classic Snake with level twists',
};

export function render() {
  setAppSolid(true);
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('section');
  wrap.className = 'stack';

  // --- Persistent progress helpers (prefix: snake:) ---
  const LS_MAX = 'snake:maxLevel';
  const LS_LAST = 'snake:lastLevel';
  const LS_BEST = 'snake:bestLen';
  function loadInt(key, dflt) {
    try { const v = parseInt(localStorage.getItem(key) || ''); return Number.isFinite(v) && v > 0 ? v : dflt; } catch { return dflt; }
  }
  function saveInt(key, v) { try { localStorage.setItem(key, String(v|0)); } catch {} }
  function clearProgress(){ try { localStorage.removeItem(LS_MAX); localStorage.removeItem(LS_LAST); } catch {} }

  let maxLevel = loadInt(LS_MAX, 1);
  let currentLevel = loadInt(LS_LAST, maxLevel);
  let bestLen = loadInt(LS_BEST, 0);
  if (!currentLevel) currentLevel = 1;
  if (currentLevel > maxLevel) currentLevel = maxLevel;

  // --- UI: header + canvas + actions ---
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'center';
  header.style.alignItems = 'center';
  header.style.marginBottom = 'var(--space-2, 8px)';

  const status = document.createElement('div');
  status.className = 'snake-status';
  status.style.textAlign = 'center';
  status.style.width = '100%';
  status.style.fontWeight = '700';

  header.append(status);

  const canvas = document.createElement('canvas');
  canvas.style.maxWidth = '100%';
  canvas.style.border = '1px solid var(--border, #2e3a52)';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Snake+ game');
  canvas.tabIndex = 0;
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';

  // Hidden live region for screen readers
  const sr = document.createElement('div');
  sr.setAttribute('aria-live', 'polite');
  sr.style.position = 'absolute';
  sr.style.width = '1px'; sr.style.height = '1px'; sr.style.padding = '0';
  sr.style.margin = '-1px'; sr.style.overflow = 'hidden'; sr.style.clip = 'rect(0,0,0,0)'; sr.style.whiteSpace = 'nowrap'; border0(sr);

  // Controls under the board, centered
  const controls = document.createElement('div');
  controls.className = 'snake-actions';
  controls.style.display = 'flex';
  controls.style.justifyContent = 'center';
  controls.style.marginTop = '12px';
  controls.innerHTML = `${Button({ id: 'snake-pause', label: 'Pause', variant: 'secondary' })}`;

  // Dynamic color config panel
  const colorPane = document.createElement('div');
  colorPane.style.display = 'none';
  colorPane.style.justifyContent = 'center';
  colorPane.style.gap = '10px';
  colorPane.style.alignItems = 'center';

  wrap.append(header, canvas, controls, colorPane, sr);
  frag.append(wrap);
  try { canvas.focus(); } catch {}

  // --- Game constants ---
  const COLS = 24;
  const ROWS = 16;
  const BG = '#0f141f';
  const GRID = '#1b2333';
  const SNAKE = '#7cb3ff';
  const FOOD = '#ff7c7c';
  const OBST = '#33425f';
  const PATH = 'rgba(230, 213, 143, 0.28)';
  const PATH_READY = 'rgba(255, 224, 102, 0.60)';
  const DEFAULT_COLORS = { bg: BG, grid: GRID, snake: SNAKE, food: FOOD, obst: OBST, path: PATH, pathReady: PATH_READY };

  function loadColors(){
    try {
      const raw = localStorage.getItem('snake:colors');
      if (!raw) return { ...DEFAULT_COLORS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_COLORS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
    } catch { return { ...DEFAULT_COLORS }; }
  }
  function saveColors(p){ try { localStorage.setItem('snake:colors', JSON.stringify(p)); } catch {} }
  function hexToRgb(hex){
    const m = String(hex).trim().replace('#','');
    const v = m.length===3 ? m.split('').map(c=>c+c).join('') : m;
    const n = parseInt(v, 16); return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
  }
  function cssToHex(css){
    const s = String(css).trim();
    if (s.startsWith('#')) return s.length===4 ? '#'+s[1]+s[1]+s[2]+s[2]+s[3]+s[3] : s;
    const m = s.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i); if (!m) return '#ffffff';
    const r = (+m[1])|0, g = (+m[2])|0, b = (+m[3])|0;
    return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  function rgbaFromHex(hex, a){ const {r,g,b} = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; }

  // Speed schedule
  function levelSpeedMs(level){ return Math.max(60, 150 - (level-1)*6); }
  function levelTarget(level){ return 5 + (level-1)*3; }
  function obstacleBaseCount(level){ return Math.max(0, Math.min(6, level-1)); }

  // Layout canvas based on container width
  function layoutCanvas(){
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const hostW = Math.max(320, wrap.clientWidth || 640);
    const cell = Math.floor(hostW / COLS);
    const w = cell * COLS;
    const h = Math.floor(cell * ROWS);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, cell, w, h };
  }

  // --- Game state ---
  let dir = { x: 1, y: 0 };
  let nextDir = dir;
  let snake = [];
  let snakeSet = new Set();
  let food = -1;
  let obstacles = new Set();
  let pathCells = new Set();
  let grownThisLevel = 0;
  let targetThisLevel = levelTarget(currentLevel);
  let tickMs = levelSpeedMs(currentLevel);
  const tickT = makeTimer();
  const pauseT = makeTimer();
  let running = false;
  let paused = false;
  let pendingLevelUp = false;
  let palette = loadColors();
  // Precomputed candidate bases for symmetric obstacle placement
  let availableBases = [];

  const { ctx, cell, w, h } = layoutCanvas();

  function idx(x, y){ return y * COLS + x; }
  function xy(i){ return { x: i % COLS, y: (i / COLS) | 0 }; }

  const BASE_LEN = 4;
  function spawnSnake(){
    snake = [];
    snakeSet = new Set();
    const sx = (COLS/2)|0; const sy = (ROWS/2)|0;
    const len = BASE_LEN;
    dir = { x: 1, y: 0 }; nextDir = dir;
    for (let i = len-1; i >= 0; i--) {
      const x = sx - i; const y = sy;
      const id = idx(x,y); snake.push(id); snakeSet.add(id);
    }
  }

  function generateObstacles(){
    obstacles = new Set();
    const count = obstacleBaseCount(currentLevel);
    if (count <= 0) return;
    addObstaclesDelta(count);
  }

  function placeFood(){
    // Respect growth cap rule: if snake length >= 150% of required path coverage,
    // apples should not appear.
    if (!applesAllowed()) { food = -1; return; }
    const occupied = new Set([...snakeSet, ...obstacles]);
    let free = [];
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      const i = idx(x,y); if (!occupied.has(i)) free.push(i);
    }
    if (free.length === 0) { food = -1; return; }
    food = free[(Math.random()*free.length)|0];
  }

  function applesAllowed(){
    const need = pathCells.size || 0;
    if (need <= 0) return true;
    const cap = Math.ceil(need * 1.5);
    return snake.length < cap;
  }

  function pathLength(level){ return Math.min(COLS*ROWS, 18 + (level-1)*8); }
  function neighborsFree(x,y){
    const out = [];
    const cand = [ [x+1,y], [x-1,y], [x,y+1], [x,y-1] ];
    for (const [nx,ny] of cand){
      if (nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      const id = idx(nx,ny);
      if (obstacles.has(id)) continue;
      out.push(id);
    }
    return out;
  }
  function computePathInPlace(){
    // Generate a corridor-like path with longer straight segments
    pathCells = new Set();
    const head = snake[snake.length-1] ?? idx((COLS/2)|0, (ROWS/2)|0);
    const need = Math.min(pathLength(currentLevel), COLS*ROWS - obstacles.size);
    const DIRS = [ {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1} ];
    function isBlocked(i){ return i<0 || i>=COLS*ROWS || obstacles.has(i) || pathCells.has(i); }
    function forwardLen(ci, d){
      let len = 0; let cur = ci;
      while (len < 64) { // cap to avoid runaway
        const c = xy(cur);
        const nx = c.x + d.x, ny = c.y + d.y;
        if (nx<0||nx>=COLS||ny<0||ny>=ROWS) break;
        const ni = idx(nx,ny);
        if (obstacles.has(ni) || pathCells.has(ni)) break;
        len++; cur = ni;
      }
      return len;
    }
    function reverse(d){ return { x: -d.x, y: -d.y }; }
    function dirEq(a,b){ return a.x===b.x && a.y===b.y; }
    function randInt(min,max){ return min + ((Math.random()*((max-min)+1))|0); }

    let cur = head;
    pathCells.add(cur);
    // Start by biasing toward the snake's current heading if present
    let d = dir && (dir.x||dir.y) ? { x: dir.x, y: dir.y } : { x: 1, y: 0 };
    const MIN_RUN = 3;
    const MAX_RUN = Math.min(10, 4 + Math.floor(currentLevel/2));

    while (pathCells.size < need) {
      let ahead = forwardLen(cur, d);
      // If we can't go straight for a decent run, pick the best alternative direction
      if (ahead < MIN_RUN) {
        let best = null, bestLen = 0;
        for (const cand of DIRS){
          if (dirEq(cand, reverse(d))) continue; // avoid immediate backtrack
          const l = forwardLen(cur, cand);
          if (l > bestLen) { bestLen = l; best = cand; }
        }
        if (!best || bestLen === 0) break; // nowhere to extend
        d = best; ahead = bestLen;
      }
      const run = Math.min(ahead, randInt(MIN_RUN, MAX_RUN));
      for (let k=0; k<run && pathCells.size < need; k++){
        const c = xy(cur);
        const ni = idx(c.x + d.x, c.y + d.y);
        if (isBlocked(ni)) { k = run; break; }
        cur = ni; pathCells.add(cur);
      }
      // Random chance to keep going straight even if allowed, to reduce zig-zag
      if (forwardLen(cur, d) >= MIN_RUN && Math.random() < 0.6) continue;
      // Otherwise choose a new direction (prefer the longer corridor)
      let best = null, bestLen = 0;
      for (const cand of DIRS){
        if (dirEq(cand, reverse(d))) continue;
        const l = forwardLen(cur, cand);
        if (l > bestLen) { bestLen = l; best = cand; }
      }
      if (best && bestLen > 0) d = best; else break;
    }
    // path is independent of current coverage; coverage is checked live against snake body
  }

  function noseProjection(len = 3){
    const res = new Set();
    const h = xy(snake[snake.length-1] || 0);
    for (let k=1;k<=len;k++){
      // project with wrap-around so new obstacles don't spawn immediately ahead
      const x = (h.x + dir.x * k + COLS) % COLS;
      const y = (h.y + dir.y * k + ROWS) % ROWS;
      res.add(idx(x,y));
    }
    return res;
  }

  function canPlaceBase(x,y, forbid){
    if (x<=0 || x>=COLS-1 || y<=0 || y>=ROWS-1) return false; // interior only
    const pts = [ [x,y], [COLS-1-x, y], [x, ROWS-1-y], [COLS-1-x, ROWS-1-y] ];
    for (const [px,py] of pts){
      const id = idx(px,py);
      if (forbid.has(id) || obstacles.has(id) || snakeSet.has(id)) return false;
    }
    return true;
  }

  function updateAvailableBases(){
    const forbid = new Set([food]);
    noseProjection(3).forEach(i=>forbid.add(i));
    availableBases = [];
    for (let y=1;y<ROWS-1;y++){
      for (let x=1;x<COLS-1;x++){
        if (canPlaceBase(x,y, forbid)) availableBases.push([x,y]);
      }
    }
  }

  function addObstaclesDelta(baseCount){
    if (baseCount <= 0) return;
    updateAvailableBases();
    let tries = 0;
    while (baseCount > 0 && tries < 400) {
      tries++;
      if (availableBases.length === 0) break;
      const pickIdx = (Math.random() * availableBases.length) | 0;
      const [bx, by] = availableBases.splice(pickIdx, 1)[0];
      // re-check with current forbid set to be safe
      const forbid = new Set([food]);
      noseProjection(3).forEach(i=>forbid.add(i));
      if (!canPlaceBase(bx, by, forbid)) continue;
      const pts = [ [bx,by], [COLS-1-bx, by], [bx, ROWS-1-by], [COLS-1-bx, ROWS-1-by] ];
      // Connectivity check: avoid creating unreachable regions (ignore snake body)
      if (!wouldKeepConnected(pts)) continue;
      for (const [x,y] of pts) obstacles.add(idx(x,y));
      baseCount--;
      // Remove symmetric counterparts from candidates
      const symKeys = new Set(pts.map(([x,y])=>x+","+y));
      for (let i=availableBases.length-1;i>=0;i--){
        const k = availableBases[i][0] + "," + availableBases[i][1];
        if (symKeys.has(k)) availableBases.splice(i,1);
      }
    }
  }

  function wouldKeepConnected(pts){
    // Build hypothetical obstacle set with the new points
    const test = new Set(obstacles);
    for (const [x,y] of pts) test.add(idx(x,y));
    // BFS from snake head across non-obstacle cells
    const headIdx = snake[snake.length-1] ?? idx((COLS/2)|0, (ROWS/2)|0);
    if (test.has(headIdx)) return false;
    const totalFree = COLS*ROWS - test.size;
    const q = [headIdx];
    const seen = new Uint8Array(COLS*ROWS);
    seen[headIdx] = 1;
    let visited = 0;
    while (q.length){
      const a = q.shift();
      visited++;
      const x = a % COLS, y = (a / COLS) | 0;
      // with wrap-around
      const nbs = [
        [(x+1+COLS)%COLS, y],
        [(x-1+COLS)%COLS, y],
        [x, (y+1+ROWS)%ROWS],
        [x, (y-1+ROWS)%ROWS],
      ];
      for (const [nx,ny] of nbs){
        const ni = idx(nx,ny);
        if (test.has(ni) || seen[ni]) continue;
        seen[ni] = 1; q.push(ni);
      }
    }
    return visited === totalFree;
  }

  function resetLevel(){
    grownThisLevel = 0;
    targetThisLevel = levelTarget(currentLevel);
    tickMs = levelSpeedMs(currentLevel);
    spawnSnake();
    generateObstacles();
    computePathInPlace();
    placeFood();
    announce(`Level ${currentLevel}. Cover the path!`);
    updateStatus();
    draw();
  }

  function levelUp(){
    // Advance maxLevel only if legitimately surpassing
    if (currentLevel === maxLevel) { maxLevel++; saveInt(LS_MAX, maxLevel); }
    currentLevel = Math.max(currentLevel+1, 1);
    saveInt(LS_LAST, currentLevel);
    // Fluid transition: keep snake where it is, only adjust targets/speed and add obstacles
    grownThisLevel = 0;
    targetThisLevel = levelTarget(currentLevel);
    tickMs = levelSpeedMs(currentLevel);
    const desiredBases = obstacleBaseCount(currentLevel);
    const currentBases = Math.floor(obstacles.size / 4);
    addObstaclesDelta(desiredBases - currentBases);
    computePathInPlace();
    announce(`Level ${currentLevel}. New obstacles added. Cover the path!`);
    updateStatus();
    draw();
  }

  function updateStatus(){
    const isPeak = bestLen > 0 && snake.length === bestLen;
    const longest = `<span style="${isPeak ? 'color: var(--link); font-weight: 800;' : ''}">Longest: ${bestLen}</span>`;
    status.innerHTML = `Level ${currentLevel} • ${longest}${paused ? ' • Paused' : ''}`;
    canvas.setAttribute('aria-label', `Snake plus level ${currentLevel}, longest snake ${bestLen}`);
  }

  function draw(){
    // background
    ctx.fillStyle = palette.bg; ctx.fillRect(0,0,w,h);
    // path (under grid)
    if (pathCells.size){
      const ready = snake.length >= pathCells.size;
      ctx.fillStyle = ready ? (palette.pathReady || PATH_READY) : (palette.path || PATH);
      pathCells.forEach(i=>{ const p=xy(i); ctx.fillRect(p.x*cell, p.y*cell, cell, cell); });
    }
    // grid (subtle)
    ctx.strokeStyle = palette.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x=0;x<=COLS;x++){ ctx.moveTo(x*cell+0.5,0); ctx.lineTo(x*cell+0.5,h); }
    for (let y=0;y<=ROWS;y++){ ctx.moveTo(0,y*cell+0.5); ctx.lineTo(w,y*cell+0.5); }
    ctx.stroke();
    // obstacles
    ctx.fillStyle = palette.obst;
    obstacles.forEach(i=>{ const p=xy(i); ctx.fillRect(p.x*cell, p.y*cell, cell, cell); });
    // food
    if (food>=0){ const p=xy(food); ctx.fillStyle = palette.food; ctx.fillRect(p.x*cell+2, p.y*cell+2, cell-4, cell-4); }
    // snake
    ctx.fillStyle = palette.snake;
    for (let i=0;i<snake.length;i++){ const p=xy(snake[i]); ctx.fillRect(p.x*cell+1, p.y*cell+1, cell-2, cell-2); }
  }

  function pickColorForCell(i){
    const ready = pathCells.size && snake.length >= pathCells.size;
    if (snakeSet.has(i)) return 'snake';
    if (i === food && food >= 0) return 'food';
    if (obstacles.has(i)) return 'obst';
    if (pathCells.has(i)) return ready ? 'pathReady' : 'path';
    return 'bg';
  }

  function showColorPicker(key){
    colorPane.innerHTML = '';
    colorPane.style.display = 'flex';
    const label = document.createElement('span');
    label.textContent = `Set ${key} color:`;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = cssToHex(palette[key] || '#ffffff');
    input.className = 'control';
    input.addEventListener('input', () => {
      const hex = input.value;
      if (key === 'path') palette.path = rgbaFromHex(hex, 0.28);
      else if (key === 'pathReady') palette.pathReady = rgbaFromHex(hex, 0.60);
      else palette[key] = hex;
      saveColors(palette);
      draw();
    });
    const resetWrap = document.createElement('div');
    resetWrap.innerHTML = Button({ id: 'snake-color-reset', label: 'Reset', variant: 'secondary' });
    const resetBtn = resetWrap.firstElementChild;
    resetBtn?.addEventListener('click', () => {
      palette[key] = DEFAULT_COLORS[key];
      saveColors(palette);
      input.value = cssToHex(palette[key]);
      draw();
    });
    colorPane.append(label, input, resetBtn);
  }

  function step(){
    if (!running) return;
    // apply nextDir if not reversing
    if (!isReverse(nextDir, dir)) dir = nextDir;
    const head = xy(snake[snake.length-1]);
    const nx = (head.x + dir.x + COLS) % COLS;
    const ny = (head.y + dir.y + ROWS) % ROWS;
    const ni = idx(nx, ny);
    if (obstacles.has(ni)) return onGameOver('Hit an obstacle');
    if (snakeSet.has(ni)) return onGameOver('Ran into yourself');
    // advance
    snake.push(ni); snakeSet.add(ni);
    if (ni === food){
      grownThisLevel++;
      placeFood();
    } else {
      // trim tail
      const tail = snake.shift();
      snakeSet.delete(tail);
    }
    // Remove apple if we have exceeded the growth cap for this level
    if (!applesAllowed() && food >= 0) { food = -1; }
    // Update longest AFTER any tail trim so count reflects visible length
    if (snake.length > bestLen) { bestLen = snake.length; saveInt(LS_BEST, bestLen); }
    // Simultaneous cover: all path cells must be occupied by the snake at once
    if (pathCells.size && allPathCoveredNow()){
      if (!pendingLevelUp) { pendingLevelUp = true; onLevelComplete(); }
      return;
    }
    updateStatus();
    draw();
    updateAvailableBases();
    tickT.after(tickMs, step);
  }

  function onLevelComplete(){
    // Seamless progression: keep snake position/length/heading
    announce(`Level ${currentLevel} complete. Advancing to next level.`);
    levelUp(); // adjusts targets/speed and adds obstacles, keeps snake
    placeFood(); // spawn fresh food now that previous one was consumed
    updateAvailableBases();
    pendingLevelUp = false;
    updateStatus();
    draw();
    if (!paused) {
      running = true;
      tickT.after(tickMs, step);
    }
  }

  function allPathCoveredNow(){
    // true if every path cell is currently occupied by the snake body
    if (!pathCells.size) return false;
    for (const id of pathCells){ if (!snakeSet.has(id)) return false; }
    return true;
  }

  function onGameOver(msg){
    // Pause for 3 move ticks, then drop a level and reset the board
    running = false; tickT.clear();
    paused = true; updateStatus();
    const waitMs = Math.max(0, tickMs * 3);
    announce(`Game over: ${msg}. Resetting soon…`);
    pauseT.after(waitMs, () => {
      paused = false;
      // Drop a level (do not reduce recorded max)
      if (currentLevel > 1) { currentLevel = Math.max(1, currentLevel - 1); saveInt(LS_LAST, currentLevel); }
      pendingLevelUp = false;
      resetLevel();
      running = true; tickT.after(tickMs, step);
    });
  }

  function start(){
    running = false; tickT.clear();
    resetLevel();
    paused = false;
    running = true; tickT.after(tickMs, step);
  }

  function announce(text){ sr.textContent = text; }
  function isReverse(a,b){ return a && b && (a.x === -b.x && a.y === -b.y); }

  // Controls
  function onKey(e){
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') nextDir = { x: 0, y: -1 };
    else if (k === 'arrowdown' || k === 's') nextDir = { x: 0, y: 1 };
    else if (k === 'arrowleft' || k === 'a') nextDir = { x: -1, y: 0 };
    else if (k === 'arrowright' || k === 'd') nextDir = { x: 1, y: 0 };
    else return;
    e.preventDefault();
  }
  document.addEventListener('keydown', onKey);
  function onCanvasClick(e){
    if (!paused) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const cx = Math.max(0, Math.min(COLS-1, Math.floor(px / (rect.width / COLS))));
    const cy = Math.max(0, Math.min(ROWS-1, Math.floor(py / (rect.height / ROWS))));
    const i = idx(cx, cy);
    const key = pickColorForCell(i);
    showColorPicker(key);
  }
  canvas.addEventListener('click', onCanvasClick);

  // Buttons
  const btnPause = controls.querySelector('#snake-pause');
  btnPause?.addEventListener('click', () => {
    if (!paused) { paused = true; running = false; tickT.clear(); announce('Paused'); if (btnPause) btnPause.textContent = 'Resume'; }
    else { paused = false; if (!running) { running = true; tickT.after(tickMs, step); } announce('Resumed'); if (btnPause) btnPause.textContent = 'Pause'; colorPane.style.display = 'none'; colorPane.innerHTML = ''; }
    updateStatus();
  });

  // Start game
  start();

  // Basic cleanup on route changes
  window.addEventListener('hashchange', () => { running = false; tickT.clear(); pauseT.clear(); document.removeEventListener('keydown', onKey); canvas.removeEventListener('click', onCanvasClick); }, { once: true });

  return frag;
}

function border0(el){ try { el.style.border = '0'; } catch {} }
