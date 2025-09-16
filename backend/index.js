const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const router = require('./core/intentionRouter');
const Consts = require('./core/intentionConsts');
const { verifyJwt } = require('./core/security/jwt');
const { isAuthorized } = require('./core/security/authorize');
const Rooms = require('./core/rooms');

// Register example and future app intents
require('./src/registerIntents')();

const app = express();
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function sendJson(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch (_) {}
}

// Broadcast a server time tick to all connected clients every 30 seconds.
// Envelope follows the project convention: { intent, ok, data }
setInterval(() => {
  try {
    const payload = { intent: 'system.time.tick', ok: true, data: { now: Date.now() } };
    const str = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        try { client.send(str); } catch (_) {}
      }
    }
  } catch (_) {}
}, 30_000);

function buildContext(ws, envelope) {
  const requestId = envelope?.message?.requestId;
  const payload = envelope?.message?.payload;
  const gameId = payload && payload.gameId;
  if (gameId) Rooms.join(ws, gameId);

  return {
    socket: ws,
    user: ws.user,
    playerId: ws.user?.playerId || ws.user?.sub || ws.user?.id,
    requestId,
    reply: (data) => sendJson(ws, { requestId, ...data }),
    broadcast: (data, opts = {}) => {
      const targetGameId = opts.gameId || gameId;
      if (!targetGameId) return;
      const obj = { requestId, ...data };
      Rooms.broadcast(targetGameId, obj, opts.excludeSender ? ws : undefined);
    },
    joinRoom: (roomId) => Rooms.join(ws, roomId),
    leaveRoom: (roomId) => Rooms.leave(ws, roomId),
    rooms: () => Array.from(Rooms.getRoomsForSocket(ws)),
    logger: console,
    time: Date.now
  };
}

wss.on('connection', (ws) => {
  // Lifecycle open event
  router.dispatch(Consts.ON_WEB_SOCKET_OPEN, {}, buildContext(ws, {}));

  ws.on('message', async (data) => {
    let envelope;
    try {
      envelope = JSON.parse(data);
    } catch (err) {
      return sendJson(ws, { ok: false, error: { code: 'bad.request', message: 'Invalid JSON' } });
    }

    // Expect { auth: { jwt }, message: { intent, payload, requestId? } }
    const intent = envelope?.message?.intent;
    const payload = envelope?.message?.payload;
    const token = envelope?.auth?.jwt || envelope?.auth?.token;

    // Allow unauthenticated bootstrap for guest token
    const isGuestBootstrap = intent === 'system.auth.guest';
    if (!token && !isGuestBootstrap) {
      return sendJson(ws, { ok: false, error: { code: 'auth.missing', message: 'Missing JWT' } });
    }

    try {
      // Cache user after first successful verify, but re-verify each message if you prefer
      if (!ws.user && token) {
        ws.user = verifyJwt(token);
      }
    } catch (err) {
      return sendJson(ws, { ok: false, error: { code: 'auth.invalid', message: 'Invalid JWT' } });
    }

    if (!intent) {
      return sendJson(ws, { ok: false, error: { code: 'intent.missing', message: 'Missing intent' } });
    }

    // Authorization per intent
    if (!isGuestBootstrap && !isAuthorized(ws.user, intent)) {
      return sendJson(ws, { ok: false, error: { code: 'authz.denied', message: 'Not authorized' } });
    }

    const ctx = buildContext(ws, envelope);
    const result = await router.dispatch(intent, payload, ctx);

    // Default policy: broadcast to room (including sender) when a gameId is present
    // unless the handler explicitly opts out with broadcast === false, and only on success.
    const ok = result?.ok !== false;
    const hasRoom = Boolean(payload && payload.gameId);
    const shouldBroadcast = hasRoom && ok && result?.broadcast !== false;

    if (shouldBroadcast) {
      ctx.broadcast({ intent, ok, data: result?.data, error: result?.error });
    } else {
      ctx.reply({ intent, ok, data: result?.data, error: result?.error });
    }
  });

  ws.on('close', (code, reason) => {
    router.dispatch(Consts.ON_WEB_SOCKET_CLOSE, { code, reason: String(reason || '') }, buildContext(ws, {}));
    Rooms.leaveAll(ws);
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
server.listen(PORT, () => {
  console.log(`HTTP+WS listening on :${PORT}`);
});
