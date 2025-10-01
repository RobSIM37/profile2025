export function createCustomerArea() {
  const area = document.createElement('aside');
  area.className = 'mf-customer-area';
  area.style.display = 'grid';
  area.style.gridTemplateColumns = 'minmax(140px, 200px) minmax(0, 1fr)';
  area.style.gap = 'var(--space-4)';
  area.style.padding = 'var(--space-4)';
  area.style.background = 'var(--bg-elev)';
  area.style.borderRadius = 'var(--radius)';
  area.style.boxShadow = '0 0 0 1px var(--border)';
  area.style.maxHeight = '255px';
  area.style.alignSelf = 'start';

  const bust = document.createElement('div');
  bust.className = 'mf-customer-bust';
  bust.style.display = 'grid';
  bust.style.placeItems = 'center';
  bust.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(0,0,0,0.25))';
  bust.style.border = '2px solid rgba(0,0,0,0.35)';
  bust.style.borderRadius = '50%';
  bust.style.aspectRatio = '1';
  bust.style.color = 'var(--muted)';
  bust.style.fontWeight = '600';
  bust.style.maxWidth = '140px';
  bust.style.height = '140px';
  bust.style.minHeight = '120px';
  bust.style.margin = '0 auto';
  bust.textContent = 'Customer';

  const chatLog = document.createElement('div');
  chatLog.className = 'mf-chat-log';
  chatLog.style.display = 'grid';
  chatLog.style.gridAutoRows = 'max-content';
  chatLog.style.gap = 'var(--space-3)';
  chatLog.style.padding = 'var(--space-3)';
  chatLog.style.background = 'rgba(0,0,0,0.15)';
  chatLog.style.borderRadius = 'calc(var(--radius) / 1.5)';
  chatLog.style.overflowY = 'auto';
  chatLog.style.maxHeight = '230px';
  chatLog.classList.add('scroll-themed');
  chatLog.style.setProperty('--scrollbar-track', 'rgba(0, 0, 0, 0.2)');
  chatLog.style.setProperty('--scrollbar-thumb', 'rgba(255, 255, 255, 0.35)');
  chatLog.style.setProperty('--scrollbar-thumb-hover', 'rgba(255, 255, 255, 0.55)');
  chatLog.style.minHeight = '0';

  chatLog.append(
    createChatMessage('customer', 'Need something sunny today.'),
    createChatMessage('player', 'Attempt #1 · d r y'),
    createChatMessage('customer', 'Closer! Center needs pop.'),
    createChatMessage('player', 'Attempt #2 · d d y'),
    createChatMessage('customer', 'Better, but make the middle brighter.'),
    createChatMessage('player', 'On it! Swapping the center now.'),
    createChatMessage('customer', 'Great! Snap a photo when it is ready.')
  );

  area.append(bust, chatLog);
  return area;
}

function createChatMessage(role, text) {
  const isCustomer = role === 'customer';
  const wrapper = document.createElement('div');
  wrapper.className = `mf-chat-message is-${role}`;
  wrapper.style.display = 'grid';
  wrapper.style.gap = 'var(--space-2)';
  wrapper.style.padding = 'var(--space-2) var(--space-3)';
  wrapper.style.borderRadius = 'calc(var(--radius) / 1.5)';
  wrapper.style.background = isCustomer ? 'rgba(255, 234, 167, 0.55)' : 'rgba(167, 210, 255, 0.55)';
  wrapper.style.width = 'fit-content';
  wrapper.style.maxWidth = '100%';
  wrapper.style.justifySelf = isCustomer ? 'start' : 'end';
  wrapper.style.textAlign = isCustomer ? 'left' : 'right';

  const label = document.createElement('span');
  label.textContent = isCustomer ? 'Customer' : 'You';
  label.style.fontSize = '0.7rem';
  label.style.textTransform = 'uppercase';
  label.style.letterSpacing = '0.08em';
  label.style.opacity = '0.75';

  const body = document.createElement('p');
  body.textContent = text;
  body.style.margin = '0';
  body.style.lineHeight = '1.3';

  wrapper.append(label, body);
  return wrapper;
}