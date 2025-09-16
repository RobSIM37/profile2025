module.exports = async (payload, ctx) => {
  const msg = String(payload?.msg ?? payload?.text ?? '');
  const reply = msg ? `${msg} | BE: received` : 'BE: no message provided';
  return { ok: true, data: { reply }, broadcast: false };
};

