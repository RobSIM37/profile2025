export function createCustomerArea() {
  const area = document.createElement('aside');
  area.className = 'mf-customer-area';

  const chatLog = document.createElement('div');
  chatLog.className = 'mf-chat-log scroll-themed';

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

  const label = document.createElement('span');
  label.className = 'mf-chat-label';
  label.textContent = isCustomer ? 'Customer' : 'You';

  const body = document.createElement('p');
  body.className = 'mf-chat-body';
  body.textContent = text;

  wrapper.append(label, body);
  return wrapper;
}
