import { FLOWER_COLOR_BY_CODE, buildGuessGridRows, describePuzzlePlain, normalizeGuessCodes } from './puzzleEngine.js';

export function createChatSession({ puzzle = null, customer = null } = {}) {
  return {
    id: `mf-chat-${puzzle?.id ?? Date.now()}`,
    puzzleId: puzzle?.id ?? null,
    customer,
    entries: [],
    version: 0,
  };
}

export function addCustomerPuzzleIntro(session, { puzzle } = {}) {
  if (!session) return;
  const text = describePuzzlePlain(puzzle);
  session.entries.push(createEntry('customer', { text }));
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

export function addCustomerResponse(session, text) {
  if (!session) return;
  session.entries.push(createEntry('customer', { text }));
  bumpVersion(session);
}

export function addSystemMessage(session, text, { label } = {}) {
  if (!session || typeof text !== 'string' || !text.length) return;
  session.entries.push(createEntry('system', { text, label }));
  bumpVersion(session);
}

function createEntry(role, { text = '', label, attachments = [], meta = null } = {}) {
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : 'customer';
  return {
    id: `mf-chat-entry-${normalizedRole}-${Math.random().toString(16).slice(2, 8)}`,
    role: normalizedRole,
    text,
    label: label || defaultLabel(normalizedRole),
    attachments,
    meta,
  };
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
