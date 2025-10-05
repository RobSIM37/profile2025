const TOKEN_CLASS_MAP = {
  warm: 'mf-chat-token-warm',
  cool: 'mf-chat-token-cool',
  flower: 'mf-chat-token-flower',
};

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

  function setPaused(paused) {
    const isPaused = Boolean(paused);
    if (isPaused) {
      chatLog.style.pointerEvents = 'none';
      chatLog.style.overflowY = 'hidden';
      area.classList.add('is-paused');
      chatLog.setAttribute('aria-disabled', 'true');
    } else {
      chatLog.style.pointerEvents = '';
      chatLog.style.overflowY = '';
      area.classList.remove('is-paused');
      chatLog.removeAttribute('aria-disabled');
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  }

  return {
    root: area,
    appendMessage,
    appendEntry,
    setEntries,
    clearMessages,
    setPaused,
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

    const hasSegments = Array.isArray(entry.segments) && entry.segments.length > 0;
    const hasText = typeof entry.text === 'string' && entry.text.length > 0;

    if (hasSegments || hasText) {
      const body = document.createElement('p');
      body.className = 'mf-chat-body';
      if (hasSegments) {
        renderSegments(body, entry.segments);
      } else {
        body.textContent = entry.text;
      }
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

  function renderSegments(parent, segments = []) {
    segments.forEach((segment) => {
      if (!segment || typeof segment.text !== 'string') return;
      const span = document.createElement('span');
      span.className = 'mf-chat-segment';
      const token = typeof segment.token === 'string' ? segment.token.toLowerCase() : '';
      const tokenClass = TOKEN_CLASS_MAP[token];
      if (tokenClass) {
        span.classList.add(tokenClass);
      }
      span.textContent = segment.text;
      parent.append(span);
    });
  }

  function renderAttachment(attachment) {
    if (!attachment || typeof attachment !== 'object') return null;
    if (attachment.type === 'guess-grid') {
      return renderGuessGrid(attachment);
    }
    return null;
  }

  function renderGuessGrid(attachment) {
    const columns = Number.isFinite(attachment?.columns) ? attachment.columns : 3;
    const rows = Number.isFinite(attachment?.rows) ? attachment.rows : 2;
    const totalSlots = Math.max(0, columns * rows);

    const grid = document.createElement('div');
    grid.className = 'mf-chat-guess-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(' + columns + ', 10px)';
    grid.style.gridAutoRows = '10px';
    grid.style.columnGap = '4px';
    grid.style.rowGap = '4px';
    grid.style.padding = '4px';
    grid.style.borderRadius = '6px';
    grid.style.background = 'rgba(255, 255, 255, 0.08)';
    grid.style.alignItems = 'center';
    grid.style.justifyItems = 'center';

    const slots = normalizeGuessGridSlots(attachment, totalSlots);

    for (let i = 0; i < totalSlots; i += 1) {
      const slot = slots[i];
      const cell = document.createElement('div');
      cell.style.width = '10px';
      cell.style.height = '10px';
      cell.style.display = 'flex';
      cell.style.alignItems = 'center';
      cell.style.justifyContent = 'center';

      if (slot) {
        const dot = document.createElement('span');
        dot.className = 'mf-chat-guess-dot';
        dot.style.display = 'inline-block';
        dot.style.width = '9px';
        dot.style.height = '9px';
        dot.style.borderRadius = '50%';
        dot.style.background = slot.color || '#d0d0d0';
        dot.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.2)';
        dot.title = typeof slot.code === 'string' ? slot.code.toUpperCase() : '';
        cell.append(dot);
      }

      grid.append(cell);
    }

    return grid;
  }

  function normalizeGuessGridSlots(attachment, totalSlots) {
    const rows = Array.isArray(attachment?.rows) ? attachment.rows : [];
    const flattenedRows = rows.reduce((acc, row) => {
      if (Array.isArray(row)) {
        row.forEach((slot) => acc.push(slot));
      }
      return acc;
    }, []);
    const rawSlots = Array.isArray(attachment?.slots) ? attachment.slots : flattenedRows;

    const normalized = rawSlots.map((slot) => {
      if (!slot) return null;
      if (typeof slot === 'object') {
        const code = typeof slot.code === 'string' ? slot.code : null;
        if (!code) return null;
        const color = typeof slot.color === 'string' ? slot.color : '#d0d0d0';
        return { code, color };
      }
      if (typeof slot === 'string') {
        return { code: slot, color: '#d0d0d0' };
      }
      return null;
    });

    const result = normalized.slice(0, totalSlots);
    while (result.length < totalSlots) {
      result.push(null);
    }
    return result;
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
    const segments = Array.isArray(entry.segments)
      ? entry.segments
          .map((segment) => {
            if (!segment || typeof segment.text !== 'string') return null;
            return {
              text: segment.text,
              token: typeof segment.token === 'string' ? segment.token : 'plain',
            };
          })
          .filter(Boolean)
      : [];
    if (!text.length && segments.length === 0 && attachments.length === 0) {
      return null;
    }
    return {
      role: entry.role || 'customer',
      text,
      label: entry.label,
      attachments,
      segments,
    };
  }
}








