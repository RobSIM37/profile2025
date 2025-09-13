module.exports = async (payload, ctx) => {
  const roomId = payload?.roomId || payload?.gameId;
  if (!roomId) {
    return { ok: false, error: { code: 'room.missing', message: 'roomId or gameId required' }, broadcast: false };
  }
  ctx.joinRoom(roomId);
  return { ok: true, data: { joined: roomId }, broadcast: false };
};

