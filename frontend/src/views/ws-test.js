import ws from '../lib/ws.js';
import { Button } from '../components/ui/button.js';
import { textField } from '../components/ui/inputs.js';
import { HudStat } from '../components/ui/hudStat.js';

export const meta = {
  title: 'WS Test',
  description: 'Echo round-trip and server tick broadcast',
};

export function render() {
  const root = document.createElement('section');
  root.className = 'stack';

  // Heading
  const h2 = document.createElement('h2');
  h2.textContent = 'WebSocket Round-Trip Test';

  // Token saver (optional, for dev convenience)
  const tokenField = textField({ id: 'ws-token', label: 'JWT (paste for dev)', placeholder: 'eyJhbGciOi...' });
  const saveWrap = document.createElement('div');
  saveWrap.innerHTML = Button({ id: 'ws-save-token', label: 'Save Token', variant: 'secondary' });
  const saveBtn = saveWrap.firstElementChild;
  saveBtn.addEventListener('click', () => {
    const t = tokenField.input.value.trim();
    if (t) ws.setToken(t);
  });

  // Echo input + button
  const msgField = textField({ id: 'ws-echo', label: 'Message', placeholder: 'Type a message' });
  const sendWrap = document.createElement('div');
  sendWrap.innerHTML = Button({ id: 'ws-send', label: 'Send Echo' });
  const sendBtn = sendWrap.firstElementChild;

  const out = document.createElement('p');
  out.className = 'text-subtle';
  out.textContent = 'Response will appear here.';

  sendBtn.addEventListener('click', async () => {
    const msg = msgField.input.value.trim();
    if (!msg) return;
    out.textContent = 'Sending...';
    try {
      const res = await ws.send('chat.echo', { msg }, { timeout: 5000 });
      if (res?.ok) {
        out.textContent = `Reply: ${res?.data?.reply ?? ''}`;
      } else {
        out.textContent = `Error: ${res?.error?.code ?? 'unknown'}`;
      }
    } catch (err) {
      out.textContent = `Error: ${err?.message ?? 'failed'}`;
    }
  });

  // Time tick subscription
  const hud = HudStat({ label: 'Server Time', value: '-' });
  const unsub = ws.on('system.time.tick', (msg) => {
    try {
      const ts = msg?.data?.now ? new Date(msg.data.now) : new Date();
      hud.val.textContent = ts.toLocaleTimeString();
    } catch {
      hud.val.textContent = String(Date.now());
    }
  });
  // Clean up listener when leaving route
  const onNav = (e) => {
    const path = e?.detail?.path;
    if (typeof path === 'string' && path !== '/ws-test') {
      try { unsub && unsub(); } catch {}
      window.removeEventListener('app:navigate', onNav);
    }
  };
  window.addEventListener('app:navigate', onNav);

  const blurb = document.createElement('p');
  blurb.innerHTML = `
    This page sends an echo message to the backend and displays
    the reply with an appended string. It also subscribes to a
    server broadcast every 30 seconds. For local dev, mint a JWT and
    paste it above, or set it via <code>ws.setToken('&lt;JWT&gt;')</code> in the console.
  `;

  root.append(
    h2,
    blurb,
    tokenField.wrapper,
    saveWrap,
    document.createElement('hr'),
    msgField.wrapper,
    sendWrap,
    out,
    document.createElement('hr'),
    hud.root,
  );

  return root;
}
