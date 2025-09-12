// HudStat: small labeled value tile used in game HUDs
// Signature: HudStat({ label, value }) -> { root, val }

export function HudStat({ label = '', value = '' } = {}) {
  const root = document.createElement('div');
  root.style.textAlign = 'center';
  root.style.background = 'var(--bg-elev)';
  root.style.border = '1px solid var(--border)';
  root.style.borderRadius = '8px';
  root.style.padding = '6px 8px';

  const lab = document.createElement('div');
  lab.textContent = String(label);
  lab.style.fontSize = '12px';
  lab.style.color = 'var(--muted)';

  const val = document.createElement('div');
  val.textContent = String(value);
  val.style.fontWeight = '700';
  val.style.fontSize = '16px';

  root.append(lab, val);
  return { root, val };
}

