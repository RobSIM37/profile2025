export function createCustomerArea() {
  const area = document.createElement('aside');
  area.className = 'mf-customer-area';
  area.style.display = 'flex';
  area.style.flexDirection = 'column';
  area.style.padding = 'var(--space-4)';
  area.style.width = '100%';
  area.style.maxWidth = '100%';
  area.style.minWidth = '0';
  area.style.boxSizing = 'border-box';
  area.style.overflow = 'hidden';
  area.style.background = 'var(--bg-elev)';
  area.style.borderRadius = 'var(--radius)';
  area.style.boxShadow = '0 0 0 1px var(--border)';
  area.style.alignSelf = 'stretch';
  area.style.margin = '0';
  area.style.height = '100%';
  area.style.maxHeight = 'none';
  area.style.flex = '1 1 auto';
  area.style.minHeight = '0';
  area.style.gap = 'var(--space-3)';

  const chatLog = document.createElement('div');
  chatLog.className = 'mf-chat-log';
  chatLog.style.display = 'flex';
  chatLog.style.flexDirection = 'column';
  chatLog.style.alignItems = 'stretch';
  chatLog.style.gap = 'var(--space-3)';
  chatLog.style.padding = 'var(--space-3)';
  chatLog.style.width = '100%';
  chatLog.style.maxWidth = '100%';
  chatLog.style.boxSizing = 'border-box';
  chatLog.style.overflowX = 'hidden';
  chatLog.style.background = 'rgba(0,0,0,0.15)';
  chatLog.style.borderRadius = 'calc(var(--radius) / 1.5)';
  chatLog.style.overflowY = 'auto';
  chatLog.style.maxHeight = '100%';
  chatLog.style.height = '0';
  chatLog.style.minWidth = '0';
  chatLog.style.flex = '1 1 auto';
  chatLog.classList.add('scroll-themed');
  chatLog.style.setProperty('--scrollbar-track', 'rgba(0, 0, 0, 0.2)');
  chatLog.style.setProperty('--scrollbar-thumb', 'rgba(255, 255, 255, 0.35)');
  chatLog.style.setProperty('--scrollbar-thumb-hover', 'rgba(255, 255, 255, 0.55)');
  chatLog.style.minHeight = '0';

  chatLog.append(
    createChatMessage('customer', 'Need something sunny today.'),
    createChatMessage('player', 'Attempt #1 - d r y'),
    createChatMessage('customer', 'Closer! Center needs pop.'),
    createChatMessage('player', 'Attempt #2 - d d y'),
    createChatMessage('customer', 'Better, but make the middle brighter.'),
    createChatMessage('player', 'On it! Swapping the center now.'),
    createChatMessage('customer', 'Great! Snap a photo when it is ready.')
  );

  area.append(chatLog);
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
  wrapper.style.textAlign = isCustomer ? 'left' : 'right';
  wrapper.style.flex = '0 0 auto';
  wrapper.style.alignSelf = isCustomer ? 'flex-start' : 'flex-end';

  const label = document.createElement('span');
  label.textContent = isCustomer ? 'Customer' : 'You';
  label.style.fontSize = '0.7rem';
  label.style.textTransform = 'uppercase';
  label.style.letterSpacing = '0.08em';
  label.style.opacity = '0.75';
  label.style.textAlign = isCustomer ? 'left' : 'right';
  label.style.justifySelf = isCustomer ? 'start' : 'end';

  const body = document.createElement('p');
  body.textContent = text;
  body.style.margin = '0';
  body.style.lineHeight = '1.3';
  body.style.textAlign = isCustomer ? 'left' : 'right';
  body.style.justifySelf = isCustomer ? 'start' : 'end';

  wrapper.append(label, body);
  return wrapper;
}
