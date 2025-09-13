// Simple in-memory room registry for WS connections
// roomId -> Set<WebSocket>
const rooms = new Map();
// WebSocket -> Set<roomId>
const socketRooms = new WeakMap();

function join(ws, roomId) {
  if (!roomId) return;
  let set = rooms.get(roomId);
  if (!set) rooms.set(roomId, (set = new Set()));
  set.add(ws);
  let s = socketRooms.get(ws);
  if (!s) socketRooms.set(ws, (s = new Set()));
  s.add(roomId);
}

function leave(ws, roomId) {
  if (!roomId) return;
  const set = rooms.get(roomId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) rooms.delete(roomId);
  }
  const s = socketRooms.get(ws);
  if (s) {
    s.delete(roomId);
    if (s.size === 0) socketRooms.delete(ws);
  }
}

function leaveAll(ws) {
  const s = socketRooms.get(ws);
  if (!s) return;
  for (const roomId of s) {
    const set = rooms.get(roomId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) rooms.delete(roomId);
    }
  }
  socketRooms.delete(ws);
}

function broadcast(roomId, obj, except) {
  const set = rooms.get(roomId);
  if (!set) return;
  const str = JSON.stringify(obj);
  for (const client of set) {
    if (client.readyState === 1 && client !== except) {
      try { client.send(str); } catch (_) {}
    }
  }
}

function members(roomId) {
  return rooms.get(roomId) || new Set();
}

function getRoomsForSocket(ws) {
  return socketRooms.get(ws) || new Set();
}

module.exports = {
  join,
  leave,
  leaveAll,
  broadcast,
  members,
  getRoomsForSocket
};

