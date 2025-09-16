const { signJwt } = require('../../../core/security/jwt');

function randomId(prefix = 'guest_') {
  return prefix + Math.random().toString(16).slice(2) + Date.now().toString(36);
}

module.exports = async (payload, ctx) => {
  // Issue a short-lived guest token with limited capabilities.
  const sub = randomId('guest:');
  const playerId = randomId('p:');

  const roles = ['guest'];
  const permissionsVersion = 1;

  let token;
  try {
    token = signJwt({ sub, playerId, roles, permissionsVersion }, { expiresIn: '12h' });
  } catch (err) {
    return { ok: false, error: { code: 'guest.unavailable', message: err.message || 'Guest auth unavailable' }, broadcast: false };
  }

  return { ok: true, data: { token, sub, playerId, role: 'guest', expiresIn: '12h' }, broadcast: false };
};

