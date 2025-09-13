module.exports = async (payload, ctx) => {
  return { ok: true, data: { pong: true, at: Date.now(), echo: payload?.echo } };
};

