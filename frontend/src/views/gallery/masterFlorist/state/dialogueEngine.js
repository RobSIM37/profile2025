const DEFAULT_GLUE = Object.freeze({ between: ', ', last_joiner: ', and ', end: '.' });
const DEFAULT_PROBABILITIES = Object.freeze({
  request_filler_before: 0,
  request_filler_after: 0,
  response_filler_before: 0,
  response_filler_after: 0,
});
const KNOWN_TONES = ['positive', 'neutral', 'negative'];

const rawDialogConfig = await loadDialogConfig();
const CONFIG = normaliseDialogConfig(rawDialogConfig);

export function buildCustomerIntro({ puzzle, customer } = {}) {
  const personaKey = resolvePersonaKey(customer);
  const mood = normalizeMood(customer?.mood ?? puzzle?.mood);
  const slotCount = resolveSlotCount(puzzle);
  const rng = createTurnRng(puzzle, 0);
  const requestText = buildRequestText({ personaKey, mood, slotCount, rng });
  return createPayload(requestText);
}

export function buildCustomerFeedback({ puzzle, evaluation, previousEvaluation, customer } = {}) {
  const personaKey = resolvePersonaKey(customer);
  const mood = normalizeMood(customer?.mood ?? puzzle?.mood);
  const slotCount = resolveSlotCount(puzzle, evaluation);
  const counts = computeCounts(evaluation, slotCount);
  const previousWrong = computeWrong(previousEvaluation, slotCount);
  const tone = resolveTone(counts.wrong, previousWrong, slotCount);
  const turnIndex = resolveTurnIndex(puzzle);
  const rng = createTurnRng(puzzle, turnIndex);
  const allowFiller = turnIndex > 1;
  const responseText = buildResponseText({ personaKey, mood, tone, counts, rng, allowFiller });
  return createPayload(responseText);
}

export function buildCustomerAcceptance({ puzzle, evaluation, previousEvaluation, customer } = {}) {
  const personaKey = resolvePersonaKey(customer);
  const mood = normalizeMood(customer?.mood ?? puzzle?.mood);
  const slotCount = resolveSlotCount(puzzle, evaluation);
  const counts = computeCounts(evaluation, slotCount);
  const previousWrong = computeWrong(previousEvaluation, slotCount);
  const tone = counts.wrong === 0 ? 'positive' : resolveTone(counts.wrong, previousWrong, slotCount);
  const turnIndex = resolveTurnIndex(puzzle);
  const rng = createTurnRng(puzzle, turnIndex);
  const allowFiller = turnIndex > 1;
  const responseText = buildResponseText({ personaKey, mood, tone, counts, rng, allowFiller });
  return createPayload(responseText);
}

export function determineTone({ evaluation, previousEvaluation, slotCount } = {}) {
  const resolvedSlotCount = clampSlotCount(slotCount ?? resolveSlotCount(null, evaluation));
  const counts = computeCounts(evaluation, resolvedSlotCount);
  const previousWrong = computeWrong(previousEvaluation, resolvedSlotCount);
  return resolveTone(counts.wrong, previousWrong, resolvedSlotCount);
}

function buildRequestText({ personaKey, mood, slotCount, rng }) {
  const templates = CONFIG.templates || {};
  const probabilities = templates.probabilities || DEFAULT_PROBABILITIES;
  const chance = probabilities.request_filler_before ?? DEFAULT_PROBABILITIES.request_filler_before;
  const before = maybePickRequestFiller({ personaKey, mood, chance, kind: 'prefixes', rng });
  const requestTemplate = pickTemplate(templates.request, rng);
  const core = renderTemplate(requestTemplate, { len: slotCount });
  const afterChance = probabilities.request_filler_after ?? DEFAULT_PROBABILITIES.request_filler_after;
  const after = maybePickRequestFiller({ personaKey, mood, chance: afterChance, kind: 'suffixes', rng });
  return joinUtteranceParts([before, core, after]);
}

function buildResponseText({ personaKey, mood, tone, counts, rng, allowFiller = true }) {
  const templates = CONFIG.templates || {};
  const probabilities = templates.probabilities || DEFAULT_PROBABILITIES;
  const normalizedTone = KNOWN_TONES.includes(tone) ? tone : 'neutral';
  const beforeChance = probabilities.response_filler_before ?? DEFAULT_PROBABILITIES.response_filler_before;
  const before = allowFiller ? maybePickResponseFiller({ personaKey, mood, tone: normalizedTone, chance: beforeChance, kind: 'prefixes', rng }) : '';
  const clauseText = buildClauseText({ counts, rng });
  const afterChance = probabilities.response_filler_after ?? DEFAULT_PROBABILITIES.response_filler_after;
  const after = allowFiller ? maybePickResponseFiller({ personaKey, mood, tone: normalizedTone, chance: afterChance, kind: 'suffixes', rng }) : '';
  return joinUtteranceParts([before, clauseText, after]);
}

function buildClauseText({ counts, rng }) {
  const templates = CONFIG.templates || {};
  const clausesConfig = templates.clauses || {};
  const glue = {
    between: templates.glue?.between ?? DEFAULT_GLUE.between,
    last_joiner: templates.glue?.last_joiner ?? DEFAULT_GLUE.last_joiner,
    end: templates.glue?.end ?? DEFAULT_GLUE.end,
  };
  const rules = clausesConfig.rules || {};
  const clausePieces = [];
  if (!rules.omit_zero_exact || counts.exact > 0) {
    const template = pickTemplate(clausesConfig.exact, rng);
    clausePieces.push(renderTemplate(template, counts));
  }
  if (!rules.omit_zero_misplaced || counts.misplaced > 0) {
    const template = pickTemplate(clausesConfig.misplaced, rng);
    clausePieces.push(renderTemplate(template, counts));
  }
  if (!rules.omit_zero_wrong || counts.wrong > 0) {
    const template = pickTemplate(clausesConfig.wrong, rng);
    clausePieces.push(renderTemplate(template, counts));
  }
  const joined = joinClauses(clausePieces, glue);
  return joined || renderFallbackClause(counts);
}

function renderFallbackClause(counts) {
  const parts = [];
  if (counts.exact > 0) {
    parts.push(`${counts.exact} exact match${counts.exact === 1 ? '' : 'es'}`);
  }
  if (counts.misplaced > 0) {
    parts.push(`${counts.misplaced} misplaced`);
  }
  parts.push(`${counts.wrong} wrong pick${counts.wrong === 1 ? '' : 's'}`);
  return `${parts.join(', ')}.`;
}

function maybePickRequestFiller({ personaKey, mood, chance, kind, rng }) {
  if (!shouldInclude(chance, rng)) return '';
  const list = getFillerList(personaKey, mood, ['requests', kind]);
  return pickTemplate(list, rng);
}

function maybePickResponseFiller({ personaKey, mood, tone, chance, kind, rng }) {
  if (!shouldInclude(chance, rng)) return '';
  const list = getFillerList(personaKey, mood, ['responses', tone, kind]);
  return pickTemplate(list, rng);
}

function getFillerList(personaKey, mood, pathSegments) {
  const filler = CONFIG.filler || {};
  const personaSequence = [];
  if (personaKey) {
    personaSequence.push(personaKey);
  }
  if (personaKey !== 'default') {
    personaSequence.push('default');
  }
  for (const key of personaSequence) {
    if (!key) continue;
    const personaEntry = filler[key];
    if (!personaEntry) continue;
    const moodEntry = personaEntry[mood];
    if (!moodEntry) continue;
    let node = moodEntry;
    let missing = false;
    for (const segment of pathSegments) {
      node = node?.[segment];
      if (!node) {
        missing = true;
        break;
      }
    }
    if (!missing && Array.isArray(node) && node.length) {
      const filtered = node.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
      if (filtered.length) {
        return filtered;
      }
    }
  }
  return [];
}

function joinUtteranceParts(parts) {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
}

function createPayload(text) {
  const normalized = typeof text === 'string' ? text.trim() : '';
  if (!normalized.length) {
    return { text: '', segments: [] };
  }
  return {
    text: normalized,
    segments: [segment(normalized)],
  };
}

function renderTemplate(template, context = {}) {
  const source = typeof template === 'string' ? template : '';
  const ctx = {
    len: context.len ?? 0,
    exact: context.exact ?? 0,
    misplaced: context.misplaced ?? 0,
    wrong: context.wrong ?? 0,
  };
  return source.replace(/\{([^}]+)\}/g, (match, token) => {
    const helperMatch = /^([a-zA-Z_]+)\(([^)]+)\)$/.exec(token.trim());
    if (helperMatch) {
      const [, helperName, rawArg] = helperMatch;
      const argKey = rawArg.trim();
      const value = Number(ctx[argKey]);
      if (!Number.isFinite(value)) return '';
      if (helperName === 'plural_s') return value === 1 ? '' : 's';
      if (helperName === 'is_are') return value === 1 ? 'is' : 'are';
      if (helperName === 'was_were') return value === 1 ? 'was' : 'were';
      if (helperName === 'dont_doesnt') return value === 1 ? "doesn't" : "don't";
      return '';
    }
    const replacement = ctx[token.trim()];
    if (replacement == null) return '';
    return String(replacement);
  });
}

function joinClauses(clauses, glue = DEFAULT_GLUE) {
  const cleaned = clauses
    .map((clause) => (typeof clause === 'string' ? clause.trim() : ''))
    .filter(Boolean);
  if (!cleaned.length) return '';
  if (cleaned.length === 1) {
    return cleaned[0] + (glue.end ?? DEFAULT_GLUE.end ?? '');
  }
  const between = glue.between ?? DEFAULT_GLUE.between ?? ' ';
  const lastJoiner = glue.last_joiner ?? DEFAULT_GLUE.last_joiner ?? between;
  let text = cleaned[0];
  for (let i = 1; i < cleaned.length; i += 1) {
    const clause = cleaned[i];
    if (i === cleaned.length - 1) {
      text += lastJoiner + clause;
    } else {
      text += between + clause;
    }
  }
  return text + (glue.end ?? DEFAULT_GLUE.end ?? '');
}

function pickTemplate(list, rng = Math.random) {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (list.length === 1) return list[0];
  const random = rng();
  const index = Math.min(list.length - 1, Math.max(0, Math.floor(random * list.length)));
  return list[index];
}

function shouldInclude(probability, rng = Math.random) {
  const chance = Number(probability);
  if (!Number.isFinite(chance) || chance <= 0) return false;
  if (chance >= 1) return true;
  return rng() < chance;
}

function computeCounts(evaluation, slotCount) {
  const exact = clampCount(evaluation?.exactMatches, slotCount);
  const misplaced = clampCount(evaluation?.partialMatches, slotCount - exact);
  const wrong = Math.max(0, slotCount - exact - misplaced);
  return { exact, misplaced, wrong };
}

function computeWrong(evaluation, slotCount) {
  if (!evaluation) return null;
  const counts = computeCounts(evaluation, slotCount);
  return counts.wrong;
}

function resolveTone(currentWrong, previousWrong, slotCount) {
  if (!Number.isFinite(currentWrong)) return 'neutral';
  if (!Number.isFinite(previousWrong)) {
    const length = Math.max(1, Number(slotCount) || 1);
    const half = length / 2;
    if (currentWrong < half) return 'positive';
    if (currentWrong > half) return 'negative';
    return 'neutral';
  }
  if (currentWrong < previousWrong) return 'positive';
  if (currentWrong > previousWrong) return 'negative';
  return 'neutral';
}

function resolveSlotCount(puzzle, evaluation) {
  const slotCount = clampSlotCount(puzzle?.slotCount);
  if (slotCount) return slotCount;
  const guessLength = Array.isArray(evaluation?.guess) ? evaluation.guess.length : null;
  return clampSlotCount(guessLength) || 1;
}

function clampSlotCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(1, Math.min(6, Math.round(numeric)));
}

function clampCount(value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.min(Math.round(numeric), Math.max(0, max)));
}

function resolvePersonaKey(customer) {
  const filler = CONFIG.filler || {};
  const candidates = [];
  const persona = typeof customer?.persona === 'string' ? customer.persona.trim().toLowerCase() : '';
  if (persona) {
    candidates.push(persona);
  }
  const sheet = typeof customer?.sheet === 'string' ? customer.sheet.trim().toLowerCase() : '';
  if (sheet) {
    candidates.push(sheet);
    const parts = sheet.split('_').filter(Boolean);
    if (parts.length > 1) {
      const tail = parts.slice(1).join('_');
      if (tail) candidates.push(tail);
    }
    const last = parts[parts.length - 1];
    if (last) candidates.push(last);
  }
  if (filler.default) {
    candidates.push('default');
  }
  const seen = new Set();
  for (const key of candidates) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (filler[key]) {
      return key;
    }
  }
  return '';
}

function resolveTurnIndex(puzzle) {
  if (!puzzle) return 0;
  const history = Array.isArray(puzzle.history) ? puzzle.history : [];
  return history.length;
}

function normalizeMood(value) {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized === 'neutral') return 'neutral';
  if (normalized === 'angry') return 'angry';
  if (normalized === 'complaint') return 'complaint';
  return 'happy';
}

function segment(text, token = 'plain') {
  return { text, token };
}

function createTurnRng(puzzle, turnIndex) {
  const seed = Number(puzzle?.seed);
  if (!Number.isFinite(seed)) {
    return Math.random;
  }
  const effectiveSeed = (seed ^ Number(turnIndex ?? 0)) >>> 0;
  return makeSeededRandom(effectiveSeed || 1);
}

function makeSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

async function loadDialogConfig() {
  try {
    const url = new URL('../assets/dialogue/dialog.json', import.meta.url);
    const response = await fetch(url.href, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load dialog config (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Master Florist: falling back to empty dialog config.', error);
    return null;
  }
}

function normaliseDialogConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return { templates: { request: [], clauses: {}, glue: {}, probabilities: {} }, filler: {} };
  }
  const templates = raw.templates || {};
  const filler = raw.filler || {};
  return {
    templates: {
      request: Array.isArray(templates.request) ? templates.request : [],
      clauses: templates.clauses || {},
      glue: templates.glue || {},
      probabilities: templates.probabilities || {},
    },
    filler,
  };
}





