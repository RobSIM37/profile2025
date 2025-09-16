// Lightweight WebSocket client for intent-based messaging
// Envelope: { auth: { jwt }, message: { intent, payload, requestId } }

import { getJSON, setJSON } from './storage.js';

function uuid() {
  // Simple unique ID suitable for request correlation
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function defaultURL() {
  try {
    const { protocol, hostname } = window.location;
    const secure = protocol === 'https:';
    const scheme = secure ? 'wss' : 'ws';
    return `${scheme}://${hostname}:3001`;
  } catch {
    return 'ws://localhost:3001';
  }
}

export class WSClient extends EventTarget {
  constructor() {
    super();
    this.socket = null;
    this.url = null;
    this.getToken = () => {
      try { return localStorage.getItem('auth:jwt') || getJSON('auth:jwt_raw') || null; } catch { return null; }
    };
    this._pending = new Map(); // requestId -> { resolve, reject, timeoutId }
    this._byIntent = new Map(); // intent -> Set<fn>
    this._lastRoom = null; // for route sync helper
    this._reconnect = { enabled: true, delay: 1000, max: 8000 };
    this._connecting = false;
  }

  setToken(token) {
    try { localStorage.setItem('auth:jwt', token); } catch {}
  }

  setTokenProvider(fn) {
    if (typeof fn === 'function') this.getToken = fn;
  }

  connect(opts = {}) {
    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) return;
    if (this._connecting) return;
    this._connecting = true;
    this.url = opts.url || this.url || defaultURL();
    if (opts.getToken) this.setTokenProvider(opts.getToken);
    const ws = new WebSocket(this.url);
    this.socket = ws;

    ws.addEventListener('open', () => {
      this._connecting = false;
      this.dispatchEvent(new Event('open'));
    });

    ws.addEventListener('close', () => {
      this.dispatchEvent(new Event('close'));
      this.socket = null;
      this._connecting = false;
      if (this._reconnect.enabled) {
        const d = this._reconnect.delay;
        const next = Math.min(this._reconnect.max, d * 2);
        this._reconnect.delay = next;
        setTimeout(() => this.connect({ url: this.url }), d);
      }
    });

    ws.addEventListener('error', () => {
      this.dispatchEvent(new Event('error'));
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const { requestId, intent } = msg || {};
      if (requestId && this._pending.has(requestId)) {
        const p = this._pending.get(requestId);
        this._pending.delete(requestId);
        clearTimeout(p.timeoutId);
        p.resolve(msg);
      }
      if (intent) this._emitIntent(intent, msg);
      this.dispatchEvent(new MessageEvent('message', { data: msg }));
    });
  }

  _emitIntent(intent, msg) {
    const set = this._byIntent.get(intent);
    if (!set || set.size === 0) return;
    for (const fn of set) {
      try { fn(msg); } catch {}
    }
  }

  on(intent, fn) {
    if (!this._byIntent.has(intent)) this._byIntent.set(intent, new Set());
    const set = this._byIntent.get(intent);
    set.add(fn);
    return () => { set.delete(fn); };
  }

  off(intent, fn) {
    const set = this._byIntent.get(intent);
    if (set) set.delete(fn);
  }

  async send(intent, payload = {}, opts = {}) {
    const ws = this.socket;
    if (!ws || ws.readyState !== 1) {
      this.connect();
      await new Promise((resolve) => {
        const onOpen = () => { this.removeEventListener('open', onOpen); resolve(); };
        this.addEventListener('open', onOpen);
        setTimeout(resolve, 1000);
      });
    }
    const requestId = opts.requestId || uuid();
    const token = typeof this.getToken === 'function' ? this.getToken() : null;
    const envelope = { auth: { jwt: token }, message: { intent, payload, requestId } };
    const msg = JSON.stringify(envelope);

    const timeoutMs = typeof opts.timeout === 'number' ? opts.timeout : 10000;
    const p = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._pending.delete(requestId);
        reject(new Error('timeout'));
      }, timeoutMs);
      this._pending.set(requestId, { resolve, reject, timeoutId });
    });

    try { this.socket && this.socket.send(msg); } catch (err) {
      this._pending.delete(requestId);
      throw err;
    }
    return p;
  }

  async ensureGuest() {
    try {
      const tok = typeof this.getToken === 'function' ? this.getToken() : null;
      if (tok) return { ok: true, cached: true };
      const res = await this.send('system.auth.guest', {}, { timeout: 8000 });
      if (res?.ok && res?.data?.token) {
        this.setToken(res.data.token);
        return { ok: true, issued: true };
      }
      return { ok: false, error: res?.error };
    } catch (err) {
      return { ok: false, error: { message: err?.message || 'guest bootstrap failed' } };
    }
  }

  joinRoom(idOrObj) {
    const payload = typeof idOrObj === 'string' ? { roomId: idOrObj } : (idOrObj || {});
    if (!payload.roomId && payload.gameId) {}
    return this.send('system.room.join', payload, { timeout: 5000 }).catch(() => ({}));
  }

  leaveRoom(idOrObj) {
    const payload = typeof idOrObj === 'string' ? { roomId: idOrObj } : (idOrObj || {});
    return this.send('system.room.leave', payload, { timeout: 5000 }).catch(() => ({}));
  }

  installRouteRoomSync(options = {}) {
    const derive = options.deriveRoomId || ((_path) => null);
    const getPath = () => {
      try {
        const hash = window.location.hash || '#/';
        const raw = hash.slice(1);
        const qIdx = raw.indexOf('?');
        const pathOnly = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
        return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
      } catch { return '/'; }
    };
    const handle = (path) => {
      const next = derive(path);
      const prev = this._lastRoom;
      if (prev && prev !== next) this.leaveRoom({ roomId: prev });
      if (next && next !== prev) this.joinRoom({ roomId: next });
      this._lastRoom = next || null;
    };
    handle(getPath());
    window.addEventListener('app:navigate', (e) => {
      const path = e?.detail?.path;
      if (typeof path === 'string') handle(path);
    });
  }
}

export const ws = new WSClient();
export default ws;

