import { FLOWER_COLOR_BY_CODE, buildGuessGridRows, normalizeGuessCodes } from './puzzleEngine.js';
import { buildCustomerIntro } from './dialogueEngine.js';

export function createChatSession({ puzzle = null, customer = null } = {}) {
  return {
    id: `mf-chat-${puzzle?.id ?? Date.now()}`,
    puzzleId: puzzle?.id ?? null,
    customer,
    entries: [],
    version: 0,
  };
}

export function addCustomerPuzzleIntro(session, { puzzle, customer } = {}) {
  if (!session) return;
  const payload = buildCustomerIntro({ puzzle, customer: customer ?? session.customer });
  session.entries.push(createEntry('customer', payload));
  bumpVersion(session);
}

export function recordPlayerGuess(session, { puzzle, guessCodes, evaluation } = {}) {
  if (!session) return;
  const normalizedGuess = normalizeGuessCodes(guessCodes, puzzle?.slotCount);
  const rows = buildGuessGridRows(normalizedGuess, 3);
  const gridAttachment = buildGuessGridAttachment(rows);
  session.entries.push(
    createEntry('player', {
      text: "How's this?",
      attachments: [gridAttachment],
      meta: {
        evaluation,
        guess: normalizedGuess,
      },
    }),
  );
  bumpVersion(session);
}

export function addCustomerResponse(session, payload) {
  if (!session) return;
  if (payload == null) return;
  const entryPayload = typeof payload === 'string' ? { text: payload } : payload;
  session.entries.push(createEntry('customer', entryPayload));
  bumpVersion(session);
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

function buildGuessGridAttachment(rows) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const mappedRows = normalizedRows.map((row) =>
    row.map((code) => {
      if (code == null) {
        return null;
      }
      const color = FLOWER_COLOR_BY_CODE[code] || '#d0d0d0';
      return {
        code,
        color,
      };
    }),
  );
  return {
    type: 'guess-grid',
    rows: mappedRows,
  };
}

function bumpVersion(session) {
  session.version = (session.version ?? 0) + 1;
}

