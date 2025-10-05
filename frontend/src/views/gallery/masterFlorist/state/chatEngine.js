import { MF_DROP_ZONE_COUNT } from '../canvas/constants.js';
import { FLOWER_COLOR_BY_CODE, normalizeGuessCodes } from './puzzleEngine.js';
import { buildCustomerIntro } from './dialogueEngine.js';

export function createChatSession({ puzzle = null, customer = null } = {}) {
  const customerLabel = resolveCustomerLabel(customer);
  return {
    id: `mf-chat-${puzzle?.id ?? Date.now()}`,
    puzzleId: puzzle?.id ?? null,
    customer,
    customerLabel,
    entries: [],
    version: 0,
  };
}

export function addCustomerPuzzleIntro(session, { puzzle, customer } = {}) {
  if (!session) return null;
  const effectiveCustomer = customer ?? session.customer;
  if (customer) {
    session.customer = customer;
    session.customerLabel = resolveCustomerLabel(customer);
  }
  const payload = buildCustomerIntro({ puzzle, customer: effectiveCustomer });
  const label = payload?.label || session.customerLabel || resolveCustomerLabel(effectiveCustomer);
  const entryPayload = { ...(payload || {}), label };
  const entry = createEntry('customer', entryPayload);
  session.entries.push(entry);
  bumpVersion(session);
  return entry;
}

export function recordPlayerGuess(session, { puzzle, guessCodes, evaluation, displayGuess } = {}) {
  if (!session) return null;
  const normalizedGuess = normalizeGuessCodes(guessCodes, puzzle?.slotCount);
  const normalizedDisplay = Array.isArray(displayGuess)
    ? normalizeGuessCodes(displayGuess, MF_DROP_ZONE_COUNT)
    : normalizeGuessCodes(guessCodes, MF_DROP_ZONE_COUNT);
  const gridAttachment = buildGuessGridAttachment(normalizedDisplay);
  const entry = createEntry('player', {
    text: "How's this?",
    attachments: [gridAttachment],
    meta: {
      evaluation,
      guess: normalizedGuess,
      displayGuess: normalizedDisplay,
    },
  });
  session.entries.push(entry);
  bumpVersion(session);
  return entry;
}

export function addCustomerResponse(session, payload) {
  if (!session) return null;
  if (payload == null) return;
  const basePayload = typeof payload === 'string' ? { text: payload } : { ...payload };
  if (!basePayload.label) {
    basePayload.label = session.customerLabel || resolveCustomerLabel(session.customer);
  }
  const entry = createEntry('customer', basePayload);
  session.entries.push(entry);
  bumpVersion(session);
  return entry;
}

export function addSystemMessage(session, text, { label } = {}) {
  if (!session || typeof text !== 'string' || !text.length) return;
  session.entries.push(createEntry('system', { text, label }));
  bumpVersion(session);
}

function createEntry(role, { text = '', label, attachments = [], meta = null, segments = null } = {}) {
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : 'customer';
  const normalizedAttachments = Array.isArray(attachments) ? attachments : [];
  const normalizedSegments = normalizeSegments(segments, text);
  const resolvedText = typeof text === 'string' && text.length ? text : segmentsToText(normalizedSegments);
  return {
    id: `mf-chat-entry-${normalizedRole}-${Math.random().toString(16).slice(2, 8)}`,
    role: normalizedRole,
    text: resolvedText,
    label: label || defaultLabel(normalizedRole),
    attachments: normalizedAttachments,
    meta,
    segments: normalizedSegments,
  };
}

function normalizeSegments(segments, fallbackText) {
  if (Array.isArray(segments) && segments.length) {
    return segments
      .map((part) => {
        if (!part) return null;
        if (typeof part === 'string') {
          return { text: part, token: 'plain' };
        }
        if (typeof part.text === 'string') {
          return { text: part.text, token: part.token || 'plain' };
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof fallbackText === 'string' && fallbackText.length) {
    return [{ text: fallbackText, token: 'plain' }];
  }
  return [];
}

function segmentsToText(segments = []) {
  if (!Array.isArray(segments) || !segments.length) return '';
  return segments.map((segment) => segment?.text ?? '').join('');
}

function defaultLabel(role) {
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

function resolveCustomerLabel(customer) {
  if (customer && typeof customer.label === 'string' && customer.label.trim().length) {
    return customer.label.trim();
  }
  if (customer && typeof customer.persona === 'string' && customer.persona.trim().length) {
    return formatPersonaLabel(customer.persona);
  }
  if (customer && typeof customer.name === 'string' && customer.name.trim().length) {
    return customer.name.trim();
  }
  if (customer && typeof customer.sheet === 'string' && customer.sheet.trim().length) {
    return formatPersonaLabel(customer.sheet);
  }
  return defaultLabel('customer');
}

function formatPersonaLabel(raw) {
  if (typeof raw !== 'string') {
    return defaultLabel('customer');
  }
  const trimmed = raw.trim();
  if (!trimmed.length) {
    return defaultLabel('customer');
  }
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const CHAT_GUESS_GRID_COLUMNS = 3;
const CHAT_GUESS_GRID_ROWS = 2;
const CHAT_GUESS_GRID_SIZE = CHAT_GUESS_GRID_COLUMNS * CHAT_GUESS_GRID_ROWS;

function buildGuessGridAttachment(codes) {
  const normalizedCodes = normalizeGuessCodes(codes, CHAT_GUESS_GRID_SIZE);
  const mappedSlots = normalizedCodes.map((code) => {
    if (code == null) return null;
    return {
      code,
      color: FLOWER_COLOR_BY_CODE[code] || '#d0d0d0',
    };
  });
  return {
    type: 'guess-grid',
    slots: mappedSlots,
    columns: CHAT_GUESS_GRID_COLUMNS,
    rows: CHAT_GUESS_GRID_ROWS,
  };
}

function bumpVersion(session) {
  session.version = (session.version ?? 0) + 1;
}






















