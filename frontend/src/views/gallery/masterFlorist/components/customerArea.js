export function createCustomerArea({ messages = [] } = {}) {
  const area = document.createElement('aside');
  area.className = 'mf-customer-area';

  const chatLog = document.createElement('div');
  chatLog.className = 'mf-chat-log scroll-themed';

  messages.forEach((entry) => {
    appendEntry(normalizeEntry(entry));
  });

  area.append(chatLog);

  function appendMessage(role, text, label) {
    if (typeof text !== 'string' || !text.length) return null;
    return appendEntry(normalizeEntry({ role, text, label }));
  }

  function appendEntry(entry) {
    const node = createChatNode(entry);
    if (!node) return null;
    chatLog.append(node);
    chatLog.scrollTop = chatLog.scrollHeight;
    return node;
  }

  function setEntries(entries = []) {
    chatLog.textContent = '';
    entries.forEach((entry) => {
      const normalized = normalizeEntry(entry);
      if (!normalized) return;
      const node = createChatNode(normalized);
      if (node) chatLog.append(node);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function clearMessages() {
    chatLog.textContent = '';
  }

  return {
    root: area,
    appendMessage,
    appendEntry,
    setEntries,
    clearMessages,
    get element() {
      return area;
    },
    get log() {
      return chatLog;
    },
  };

  function createChatNode(entry) {
    if (!entry) return null;
    const wrapper = document.createElement('div');
    const role = typeof entry.role === 'string' ? entry.role.toLowerCase() : 'player';
    wrapper.className = `mf-chat-message is-${role}`;

    const labelNode = document.createElement('span');
    labelNode.className = 'mf-chat-label';
    labelNode.textContent = resolveLabel(role, entry.label);

    wrapper.append(labelNode);

    if (typeof entry.text === 'string' && entry.text.length) {
      const body = document.createElement('p');
      body.className = 'mf-chat-body';
      body.textContent = entry.text;
      wrapper.append(body);
    }

    if (Array.isArray(entry.attachments)) {
      entry.attachments.forEach((attachment) => {
        const node = renderAttachment(attachment);
        if (node) wrapper.append(node);
      });
    }

    return wrapper;
  }

  function renderAttachment(attachment) {
    if (!attachment || typeof attachment !== 'object') return null;
    if (attachment.type === 'guess-grid') {
      return renderGuessGrid(attachment.rows);
    }
    return null;
  }

  function renderGuessGrid(rows) {
    const grid = document.createElement('div');
    grid.className = 'mf-chat-guess-grid';
    grid.style.display = 'grid';
    grid.style.gap = '4px';
    grid.style.padding = '6px 4px';
    grid.style.borderRadius = '12px';
    grid.style.background = 'rgba(255, 255, 255, 0.08)';

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.style.display = 'flex';
      rowEl.style.justifyContent = 'center';
      rowEl.style.gap = '6px';
      (Array.isArray(row) ? row : []).forEach((slot) => {
        const code = typeof slot === 'object' ? slot.code : slot;
        const color = (typeof slot === 'object' && slot.color) || '#d0d0d0';
        const dot = document.createElement('span');
        dot.className = 'mf-chat-guess-dot';
        dot.style.display = 'inline-block';
        dot.style.width = '18px';
        dot.style.height = '18px';
        dot.style.borderRadius = '50%';
        dot.style.background = color;
        dot.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.2)';
        dot.title = typeof code === 'string' ? code.toUpperCase() : '';
        rowEl.append(dot);
      });
      grid.append(rowEl);
    });

    return grid;
  }

  function resolveLabel(role, explicitLabel) {
    if (typeof explicitLabel === 'string' && explicitLabel.length) {
      return explicitLabel;
    }
    switch (role) {
      case 'system':
        return 'System';
      case 'player':
        return 'You';
      case 'customer':
      default:
        return 'Customer';
    }
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
    const text = typeof entry.text === 'string' ? entry.text : '';
    if (!text.length && attachments.length === 0) {
      return null;
    }
    return {
      role: entry.role || 'customer',
      text,
      label: entry.label,
      attachments,
    };
  }
}
