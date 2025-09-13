module.exports = async (payload, ctx) => {
  const roomId = payload?.roomId || payload?.gameId;
  if (!roomId) {
    return { ok: false, error: { code: 'room.missing', message: 'roomId or gameId required' }, broadcast: false };
  }
  ctx.leaveRoom(roomId);
  return { ok: true, data: { left: roomId }, broadcast: false };
};

