export function solvePuzzle(puzzle){
  const w=puzzle.width,h=puzzle.height;
  const inCells = [];
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) { const c=puzzle.getCell(x,y); if(c?.available) inCells.push({x,y,k:keyOf(x,y)}); }
  const N=inCells.length; if (N%2!==0) return { success:false, error:"Odd number of cells in puzzle." };
  const dominos=puzzle.dominos.slice(); if(dominos.length*2 < N) return { success:false, error:"Not enough domino halves for the puzzle." };
  const neighbors = buildAdjacency(puzzle,w,h,inCells);
  const cellToArea = mapCellToArea(puzzle,w,h);
  const areas = buildAreas(puzzle,inCells,cellToArea);
  const { typeCounts, types } = buildDominoTypes(dominos);

  const ctx = { w,h,N, puzzle, inCells, neighbors, cellToArea, areas, typeCounts, types,
    placements: [], assigned:new Map() };
  const ok = backtrack(ctx);
  if (!ok) return { success:false, error:"No solution found for given constraints." };
  const cellValues=new Map(); for (const {aKey,bKey,va,vb} of ctx.placements){ cellValues.set(aKey,va); cellValues.set(bKey,vb); }
  return { success:true, cellValues, placements:ctx.placements };
}

function keyOf(x,y){return `${x},${y}`}
function dKey(a,b){ return a<=b ? `${a}-${b}` : `${b}-${a}` }

function buildAdjacency(puzzle,w,h,inCells){
  const map=new Map(); const push=(k,ko)=>{ let a=map.get(k); if(!a){a=[]; map.set(k,a);} a.push(ko); };
  for (const {x,y,k} of inCells){
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy;
      if (nx>=0 && ny>=0 && nx<w && ny<h){
        const c2=puzzle.getCell(nx,ny);
        if (c2?.available) push(k,keyOf(nx,ny));
      }
    }
  }
  return map;
}
function mapCellToArea(puzzle,w,h){
  const m=new Map();
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){ const c=puzzle.getCell(x,y); if(c?.available) m.set(keyOf(x,y), c.areaId || null); }
  return m;
}
function buildAreas(puzzle,inCells,cellToArea){
  const byId=new Map();
  for (const a of puzzle.listAreas()){
    const members=[];
    for (const {k} of inCells) if (cellToArea.get(k)===a.id) members.push(k);
    if (members.length===0) continue;
    byId.set(a.id,{ id:a.id, rule:a.rule, members, sum:0, assigned:0, unassigned:members.length, counts:Array(7).fill(0) });
  }
  return byId;
}
function buildDominoTypes(dominos){
  const typeCounts=new Map();
  for (const d of dominos){ const k=dKey(d.a,d.b); typeCounts.set(k,(typeCounts.get(k)??0)+1); }
  const types=[...typeCounts.keys()].map(k=>{ const [a,b]=k.split("-").map(Number); return {a,b,k}; });
  return { typeCounts, types };
}

function backtrack(ctx){
  const { N, assigned } = ctx;
  return (function recur(placed){
    if (placed*2===N) return true;
    const pick = pickAnchorCell(ctx);
    if (!pick) return true;
    if (pick.deg===0) return false;
    const aKey=pick.key;

    const nbs = ctx.neighbors.get(aKey) || [];
    const cand = nbs.filter(nk => !assigned.has(nk));
    if (cand.length===0) return false;

    for (const bKey of cand){
      for (const t of ctx.types){
        const avail = ctx.typeCounts.get(t.k) || 0;
        if (avail<=0) continue;
        const combos = [[t.a,t.b],[t.b,t.a]];
        for (const [va,vb] of combos){
          const stA = applyValue(ctx,aKey,va);
          if (stA && !checkAreaState(stA)) { undoValue(ctx,aKey,va,stA); continue; }
          const stB = applyValue(ctx,bKey,vb);
          if (stB && !checkAreaState(stB)) { undoValue(ctx,bKey,vb,stB); undoValue(ctx,aKey,va,stA); continue; }
          ctx.typeCounts.set(t.k, avail-1);
          ctx.placements.push({ aKey,bKey,va,vb });
          if (recur(placed+1)) return true;
          ctx.placements.pop();
          ctx.typeCounts.set(t.k, avail);
          undoValue(ctx,bKey,vb,stB); undoValue(ctx,aKey,va,stA);
        }
      }
    }
    return false;
  })(0);
}

function pickAnchorCell({ inCells, neighbors, assigned }){
  let bestKey=null, bestDeg=Infinity;
  for (const {k} of inCells){
    if (assigned.has(k)) continue;
    const nbs = neighbors.get(k) || [];
    let deg=0; for (const n of nbs) if (!assigned.has(n)) deg++;
    if (deg===0) return { key:k, deg:0 };
    if (deg<bestDeg){ bestDeg=deg; bestKey=k; if (bestDeg===1) break; }
  }
  if (!bestKey) return null;
  return { key:bestKey, deg:bestDeg };
}

function applyValue(ctx, cellKey, v){
  ctx.assigned.set(cellKey,v);
  const aid = ctx.cellToArea.get(cellKey);
  if (!aid) return null;
  const st = ctx.areas.get(aid);
  if (!st) return null;
  st.sum += v;
  st.assigned += 1;
  st.unassigned -= 1;
  st.counts[v] += 1;
  return st;
}
function undoValue(ctx, cellKey, v, st){
  ctx.assigned.delete(cellKey);
  if (!st) return;
  st.sum -= v; st.assigned -= 1; st.unassigned += 1; st.counts[v] -= 1;
}

function checkAreaState(st){
  const { rule, sum, unassigned, counts } = st;
  const maxRest = 6 * unassigned;
  if (!rule) return true;

  if (rule.kind === "AllSame"){
    let distinct=0; for (let v=0; v<=6; v++){ if (counts[v]>0){ distinct++; if (distinct>1) return false; } }
    return true;
  }
  if (rule.kind === "AllDiff"){
    for (let v=0; v<=6; v++){ if (counts[v]>1) return false; }
    return true;
  }
  if (rule.kind === "SumEq"){
    const T = rule.target;
    if (sum > T) return false;
    if (sum + maxRest < T) return false;
    return true;
  }
  if (rule.kind === "SumLt"){
    return sum < rule.target;
  }
  if (rule.kind === "SumGt"){
    return sum + maxRest > rule.target;
  }
  return true;
}

