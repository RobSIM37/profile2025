export function createCustomerArea({ messages = [] } = {}) {
  const area = document.createElement('aside');
  area.className = 'mf-customer-area';

  const chatLog = document.createElement('div');
  chatLog.className = 'mf-chat-log scroll-themed';

  messages.forEach(({ role, text, label }) => {
    appendMessage(role, text, label);
  });

  area.append(chatLog);

  function appendMessage(role, text, label) {
    if (typeof text !== 'string' || !text.length) return null;
    const message = createChatMessage(role, text, label);
    chatLog.append(message);
    chatLog.scrollTop = chatLog.scrollHeight;
    return message;
  }

  function clearMessages() {
    chatLog.textContent = '';
  }

  return {
    root: area,
    appendMessage,
    clearMessages,
    get element() {
      return area;
    },
    get log() {
      return chatLog;
    },
  };

  function createChatMessage(role, text, label) {
    const wrapper = document.createElement('div');
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : 'player';
    wrapper.className = `mf-chat-message is-${normalizedRole}`;

    const labelNode = document.createElement('span');
    labelNode.className = 'mf-chat-label';
    if (typeof label === 'string' && label.length) {
      labelNode.textContent = label;
    } else if (normalizedRole === 'customer') {
      labelNode.textContent = 'Customer';
    } else if (normalizedRole === 'player') {
      labelNode.textContent = 'You';
    } else {
      labelNode.textContent = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
    }

    const body = document.createElement('p');
    body.className = 'mf-chat-body';
    body.textContent = text;

    wrapper.append(labelNode, body);
    return wrapper;
  }
}
