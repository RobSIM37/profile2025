const router = require('../core/intentionRouter');

// Example intents; replace/extend with app-specific ones.
const SYSTEM_PING = 'system.ping';
const SYSTEM_ROOM_JOIN = 'system.room.join';
const SYSTEM_ROOM_LEAVE = 'system.room.leave';

module.exports = () => {
  router.set(SYSTEM_PING, require('./handlers/system/ping'));
  router.set(SYSTEM_ROOM_JOIN, require('./handlers/system/joinRoom'));
  router.set(SYSTEM_ROOM_LEAVE, require('./handlers/system/leaveRoom'));

  // Not found: echo the missing intent with an error
  router.setNotFound(async ({ intent }, ctx) => {
    return { ok: false, error: { code: 'intent.notFound', message: `No handler for ${intent}` } };
  });

  // Fallback: last-resort safeguard
  router.setFallback(async ({ intent }, ctx) => {
    return { ok: false, error: { code: 'intent.fallback', message: `Unhandled intent ${intent}` } };
  });
};
