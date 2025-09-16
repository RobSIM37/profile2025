const router = require('../core/intentionRouter');

// Example intents; replace/extend with app-specific ones.
const SYSTEM_PING = 'system.ping';
const SYSTEM_ROOM_JOIN = 'system.room.join';
const SYSTEM_ROOM_LEAVE = 'system.room.leave';
const TEST_ECHO = 'chat.echo';
const SYSTEM_AUTH_GUEST = 'system.auth.guest';

module.exports = () => {
  router.set(SYSTEM_PING, require('./handlers/system/ping'));
  router.set(SYSTEM_ROOM_JOIN, require('./handlers/system/joinRoom'));
  router.set(SYSTEM_ROOM_LEAVE, require('./handlers/system/leaveRoom'));
  router.set(TEST_ECHO, require('./handlers/test/echo'));
  router.set(SYSTEM_AUTH_GUEST, require('./handlers/system/authGuest'));

  // Not found: echo the missing intent with an error
  router.setNotFound(async ({ intent }, ctx) => {
    return { ok: false, error: { code: 'intent.notFound', message: `No handler for ${intent}` } };
  });

  // Fallback: last-resort safeguard
  router.setFallback(async ({ intent }, ctx) => {
    return { ok: false, error: { code: 'intent.fallback', message: `Unhandled intent ${intent}` } };
  });
};
