import {
  FLOWER_GROUP_BY_CODE,
  FLOWER_GROUP_LABELS,
  FLOWER_NAME_BY_CODE,
  getFlowerGroup,
  getFlowerName,
} from './puzzleEngine.js';

const TONE_SEQUENCE = ['positive', 'neutral', 'negative'];

const FILLER_TEMPLATES = {
  happy: {
    positive: [
      'This is the kind of bouquet puzzle that keeps a {{persona}} smiling.',
      'You are making this {{persona}} day feel like spring market morning.',
    ],
    neutral: [
      'Always exciting to see what you arrange for a {{persona}} like me.',
      'Let us see what blooms you pull together for this {{persona}}.',
    ],
    negative: [
      'Even a sunny {{persona}} can wilt if we take too long.',
      'Do not make this cheerful {{persona}} wait forever.',
    ],
  },
  neutral: {
    positive: [
      'You are close enough that even a {{persona}} can feel hopeful.',
      'All right, this {{persona}} can admit the bouquet is shaping up.',
    ],
    neutral: [
      'Steady hands, steady blooms�that is how this {{persona}} likes it.',
      'I am here for a tidy arrangement, nothing fancy.',
    ],
    negative: [
      'This {{persona}} is not convinced we are headed the right way yet.',
      'I have seen better prep work on a rushed morning.',
    ],
  },
  angry: {
    positive: [
      'Fine, that is closer. Do not waste the rest of my day.',
      'At least you are finally hearing me.',
    ],
    neutral: [
      'Move fast, florist. I am not here to chat.',
      'Keep it sharp�I am timing you.',
    ],
    negative: [
      'This is wasting my time.',
      'You are not listening and it shows.',
    ],
  },
  complaint: {
    positive: [
      'Finally, some progress. Took long enough.',
      'Fine, keep going with that.',
    ],
    neutral: [
      'I came here to get what I asked for, nothing more.',
      'Just fix it.',
    ],
    negative: [
      'Unbelievable. Are we even trying?',
      'You call this service?',
    ],
  },
};

const ACCEPTANCE_TEMPLATES = {
  happy: [
    'I love how {{flowers}} play together!',
    'What a joyful blend�{{flowers}} are perfect!',
  ],
  neutral: [
    '{{flowers}} will do nicely. Practical and tidy.',
    'That is exactly the balance I wanted: {{flowers}}.',
  ],
  angry: [
    'About time. {{flowers}}�that is what I asked for.',
    'Finally. Just give me the {{flowers}}.',
  ],
  complaint: [
    'All I wanted was {{flowers}}. Try remembering next time.',
    'At last. {{flowers}}. Took you long enough.',
  ],
};

const COLOR_CLUE_TEMPLATES = {
  allWarm: [
    ['Keep it entirely ', warmToken('warm'), ' shades.'],
    ['Nothing but ', warmToken('warm'), ' blossoms, got it?'],
  ],
  allCool: [
    ['I only want ', coolToken('cool'), ' tones this time.'],
    ['Let us stay in ', coolToken('cool'), ' territory.'],
  ],
  mostlyWarm: [
    ['Lean toward ', warmToken('warm'), ' hues, just a hint of ', coolToken('cool'), '.'],
    ['Make it mostly ', warmToken('warm'), ' with a touch of ', coolToken('cool'), '.'],
  ],
  mostlyCool: [
    ['Keep it mostly ', coolToken('cool'), ' but give me a splash of ', warmToken('warm'), '.'],
    ['I prefer mostly ', coolToken('cool'), ' blooms with a little ', warmToken('warm'), '.'],
  ],
  balanced: [
    ['Give me an even mix of ', warmToken('warm'), ' and ', coolToken('cool'), ' blooms.'],
    ['Balance the ', warmToken('warm'), ' and ', coolToken('cool'), ' colors for me.'],
  ],
};

export function buildCustomerIntro({ puzzle, customer }) {
  const persona = resolvePersona(customer);
  const mood = normalizeMood(puzzle?.mood);
  const fillerTone = 'neutral';
  const sentences = [];

  sentences.push(buildFillerSentence({ mood, tone: fillerTone, persona }));
  sentences.push(buildRequestInfoSentence({ puzzle, mood }));

  return createEntryPayload(sentences);
}

export function buildCustomerFeedback({ puzzle, evaluation, previousEvaluation, customer }) {
  const persona = resolvePersona(customer);
  const mood = normalizeMood(puzzle?.mood);
  const slotCount = puzzle?.slotCount ?? evaluation?.guess?.length ?? 0;
  const tone = determineTone({ evaluation, previousEvaluation, slotCount });
  const sentences = [];

  sentences.push(buildFillerSentence({ mood, tone, persona }));

  if (evaluation?.isMatch) {
    sentences.push(buildAcceptanceSentence({ mood, evaluation }));
  } else {
    sentences.push(buildFeedbackInfoSentence({ puzzle, evaluation }));
  }

  return createEntryPayload(sentences);
}

export function buildCustomerAcceptance({ puzzle, evaluation, customer }) {
  const persona = resolvePersona(customer);
  const mood = normalizeMood(puzzle?.mood);
  const sentences = [];
  sentences.push(buildFillerSentence({ mood, tone: 'positive', persona }));
  sentences.push(buildAcceptanceSentence({ mood, evaluation }));
  return createEntryPayload(sentences);
}

export function determineTone({ evaluation, previousEvaluation, slotCount }) {
  const current = Number(evaluation?.exactMatches) || 0;
  const total = Math.max(1, Number(slotCount) || 1);

  if (previousEvaluation) {
    const previous = Number(previousEvaluation.exactMatches) || 0;
    if (current > previous) return 'positive';
    if (current < previous) return 'negative';
    return 'neutral';
  }

  const ratio = current / total;
  if (ratio > 0.5) return 'positive';
  if (ratio < 0.5) return 'negative';
  return 'neutral';
}

function buildFillerSentence({ mood, tone, persona }) {
  const toneKey = TONE_SEQUENCE.includes(tone) ? tone : 'neutral';
  const moodTemplates = FILLER_TEMPLATES[mood] || FILLER_TEMPLATES.neutral;
  const templateList = moodTemplates[toneKey] || moodTemplates.neutral;
  const text = formatTemplate(pickRandom(templateList), { persona });
  return [segment(text, 'plain')];
}

function buildRequestInfoSentence({ puzzle, mood }) {
  const slotCount = Math.max(1, puzzle?.slotCount ?? 1);
  const intro = [segment(`I need ${slotCount} stem${slotCount === 1 ? '' : 's'}.`, 'plain')];

  switch (mood) {
    case 'neutral':
      return combineSentenceSegments([intro, buildNeutralClueSentence(puzzle)]);
    case 'angry':
    case 'complaint':
      return combineSentenceSegments([intro, buildAngryClueSentence(puzzle)]);
    case 'happy':
    default:
      return intro;
  }
}

function buildNeutralClueSentence(puzzle) {
  const compositionKey = describeColorComposition(puzzle?.target || []);
  const options = COLOR_CLUE_TEMPLATES[compositionKey] || COLOR_CLUE_TEMPLATES.balanced;
  return pickRandom(options).map(normalizeTokenSegment);
}

function buildAngryClueSentence(puzzle) {
  const target = Array.isArray(puzzle?.target) ? puzzle.target.map((code) => code && code.toLowerCase()) : [];
  if (target.length === 2) {
    const names = target.map((code) => FLOWER_NAME_BY_CODE[code] || 'flower');
    const segments = [segment('Hand me ', 'plain')];
    addNameListSegments(segments, names);
    segments.push(segment(', exactly like that.', 'plain'));
    return segments;
  }
  if (target.length === 1) {
    return [segment('Just give me a flower. Any flower.', 'plain')];
  }
  return [segment('Do not mess this up.', 'plain')];
}

function buildFeedbackInfoSentence({ puzzle, evaluation }) {
  const mood = normalizeMood(puzzle?.mood);
  switch (mood) {
    case 'happy':
      return buildHappyFeedbackSentence(evaluation, puzzle);
    case 'neutral':
      return buildNeutralFeedbackSentence(evaluation);
    case 'angry':
    case 'complaint':
      return buildAngryFeedbackSentence(evaluation, puzzle);
    default:
      return buildHappyFeedbackSentence(evaluation, puzzle);
  }
}

function buildHappyFeedbackSentence(evaluation, puzzle) {
  const slotCount = Math.max(1, puzzle?.slotCount ?? evaluation?.guess?.length ?? 1);
  const exact = Number(evaluation?.exactMatches) || 0;
  const partial = Number(evaluation?.partialMatches) || 0;
  const remaining = Math.max(0, slotCount - exact - partial);
  const segments = [segment(`${exact} ${pluralize('stem', exact)} are exactly right`, 'plain')];
  if (partial > 0) {
    segments.push(segment(', ', 'plain'));
    segments.push(segment(`${partial} ${pluralize('stem', partial)} belong here but in another spot`, 'plain'));
  }
  if (remaining > 0) {
    segments.push(segment(partial > 0 ? ', ' : ', and ', 'plain'));
    segments.push(segment(`${remaining} ${pluralize('stem', remaining)} are completely off`, 'plain'));
  }
  segments.push(segment('.', 'plain'));
  return segments;
}

function buildNeutralFeedbackSentence(evaluation) {
  const guess = Array.isArray(evaluation?.guess) ? evaluation.guess : [];
  const slotStates = Array.isArray(evaluation?.slotStates) ? evaluation.slotStates : [];
  const stats = buildGroupStats(guess, slotStates);
  const groups = ['warm', 'cool'];

  const goodGroup = groups.find((group) => stats[group].wrong === 0 && (stats[group].exact + stats[group].misplaced) > 0);
  const troubleGroup = groups
    .filter((group) => stats[group].wrong > 0 || (stats[group].misplaced > 0 && stats[group].exact === 0))
    .sort((a, b) => stats[b].wrong + stats[b].misplaced - (stats[a].wrong + stats[a].misplaced))[0] || null;

  const segments = [];
  if (goodGroup) {
    segments.push(segment('The ', 'plain'));
    segments.push(groupToken(goodGroup));
    segments.push(segment(' colors are looking good', 'plain'));
    if (stats[goodGroup].misplaced > 0) {
      segments.push(segment(', just shift them around a bit', 'plain'));
    }
  }

  if (troubleGroup) {
    if (segments.length) {
      segments.push(segment(', but ', 'plain'));
    }
    segments.push(groupToken(troubleGroup));
    if (stats[troubleGroup].misplaced > 0 && stats[troubleGroup].wrong === 0) {
      segments.push(segment(' needs a new spot.', 'plain'));
    } else if (stats[troubleGroup].misplaced > 0) {
      segments.push(segment(' is not sitting where it belongs.', 'plain'));
    } else {
      segments.push(segment(' is the wrong pick.', 'plain'));
    }
  }

  if (!segments.length) {
    return [segment('Keep juggling those placements; you are close.', 'plain')];
  }

  if (!segments[segments.length - 1].text.endsWith('.')) {
    segments.push(segment('.', 'plain'));
  }
  return segments;
}

function buildAngryFeedbackSentence(evaluation, puzzle) {
  const guess = Array.isArray(evaluation?.guess) ? evaluation.guess : [];
  const slotStates = Array.isArray(evaluation?.slotStates) ? evaluation.slotStates : [];
  const wrongNames = [];
  const misplacedNames = [];

  for (let i = 0; i < guess.length; i += 1) {
    const code = guess[i];
    const name = getFlowerName(code) || 'flower';
    const state = slotStates[i];
    if (state === 'absent') {
      wrongNames.push(name);
    } else if (state === 'misplaced') {
      misplacedNames.push(name);
    }
  }

  const segments = [];
  if (wrongNames.length) {
    segments.push(segment('The ', 'plain'));
    addNameListSegments(segments, wrongNames);
    segments.push(segment(`${wrongNames.length === 1 ? ' is' : ' are'} wrong`, 'plain'));
    if (misplacedNames.length) {
      segments.push(segment('; ', 'plain'));
    } else {
      segments.push(segment('.', 'plain'));
    }
  }
  if (misplacedNames.length) {
    segments.push(segment('The ', 'plain'));
    addNameListSegments(segments, misplacedNames);
    segments.push(segment(`${misplacedNames.length === 1 ? ' belongs' : ' belong'} in a different spot.`, 'plain'));
  }

  if (!segments.length) {
    return [segment('Fix the placement. You are almost there.', 'plain')];
  }
  return segments;
}

function buildAcceptanceSentence({ mood, evaluation }) {
  const names = Array.isArray(evaluation?.guess)
    ? evaluation.guess.map((code) => getFlowerName(code) || 'flower')
    : [];
  const templateList = ACCEPTANCE_TEMPLATES[mood] || ACCEPTANCE_TEMPLATES.happy;
  const template = pickRandom(templateList);
  const placeholder = formatTemplate(template, { flowers: '{{flowers}}' });
  const [prefix, suffix] = placeholder.split('{{flowers}}');
  const segments = [];
  if (prefix) {
    segments.push(segment(prefix.trimStart(), 'plain'));
    if (!prefix.endsWith(' ')) {
      segments.push(segment(' ', 'plain'));
    }
  }
  addNameListSegments(segments, names, { capitalizeFirst: false });
  if (suffix) {
    const trimmed = suffix.trimStart();
    if (!trimmed.startsWith(' ') && segments.length) {
      segments.push(segment(' ', 'plain'));
    }
    segments.push(segment(trimmed, 'plain'));
  }
  if (!segments.length) {
    addNameListSegments(segments, names);
  }
  const lastText = segments[segments.length - 1]?.text || '';
  if (!/[.!?]$/.test(lastText)) {
    segments.push(segment('!', 'plain'));
  }
  return segments;
}

function buildGroupStats(guess, slotStates) {
  const stats = {
    warm: { exact: 0, misplaced: 0, wrong: 0 },
    cool: { exact: 0, misplaced: 0, wrong: 0 },
  };
  for (let i = 0; i < guess.length; i += 1) {
    const code = guess[i];
    const group = FLOWER_GROUP_BY_CODE[code] || getFlowerGroup(code);
    if (!group || !stats[group]) continue;
    const state = slotStates[i];
    if (state === 'exact') {
      stats[group].exact += 1;
    } else if (state === 'misplaced') {
      stats[group].misplaced += 1;
    } else if (code) {
      stats[group].wrong += 1;
    }
  }
  return stats;
}

function describeColorComposition(target) {
  let warmCount = 0;
  let coolCount = 0;
  target.forEach((code) => {
    const group = getFlowerGroup(code);
    if (group === 'warm') warmCount += 1;
    if (group === 'cool') coolCount += 1;
  });
  if (warmCount === target.length && target.length > 0) return 'allWarm';
  if (coolCount === target.length && target.length > 0) return 'allCool';
  if (warmCount > coolCount) return 'mostlyWarm';
  if (coolCount > warmCount) return 'mostlyCool';
  return 'balanced';
}

function createEntryPayload(sentences) {
  const filtered = sentences.filter((sentence) => Array.isArray(sentence) && sentence.length);
  const segments = [];
  filtered.forEach((sentence, index) => {
    if (index > 0) {
      segments.push(segment(' ', 'plain'));
    }
    sentence.forEach((part) => segments.push(normalizeTokenSegment(part)));
  });
  const text = segments.map((part) => part.text).join('');
  return {
    text,
    segments,
  };
}

function resolvePersona(customer) {
  const sheet = typeof customer?.sheet === 'string' && customer.sheet.length ? customer.sheet : 'customer';
  const words = sheet.split(/[_\-]/).filter(Boolean);
  return words.map(capitalize).join(' ') || 'Customer';
}

function normalizeMood(value) {
  const normalized = typeof value === 'string' ? value.toLowerCase() : 'happy';
  if (normalized === 'complaint') return 'complaint';
  if (normalized === 'angry') return 'angry';
  if (normalized === 'neutral') return 'neutral';
  return 'happy';
}

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (list.length === 1) return list[0];
  const index = Math.floor(Math.random() * list.length);
  return list[Math.min(Math.max(index, 0), list.length - 1)];
}

function formatTemplate(template, context = {}) {
  if (typeof template !== 'string') return '';
  return template.replace(/{{(\w+)}}/g, (match, key) => {
    const replacement = context[key];
    if (replacement == null) return '';
    return String(replacement);
  });
}

function segment(text, token = 'plain') {
  return { text, token };
}

function warmToken(text) {
  return segment(text, 'warm');
}

function coolToken(text) {
  return segment(text, 'cool');
}

function groupToken(group) {
  const label = FLOWER_GROUP_LABELS[group] || group;
  return segment(label, group === 'warm' ? 'warm' : 'cool');
}

function normalizeTokenSegment(segmentLike) {
  if (!segmentLike) return segment('', 'plain');
  if (typeof segmentLike === 'string') return segment(segmentLike, 'plain');
  if (typeof segmentLike === 'object' && typeof segmentLike.text === 'string') {
    return {
      text: segmentLike.text,
      token: segmentLike.token || 'plain',
    };
  }
  return segment(String(segmentLike), 'plain');
}

function addNameListSegments(segments, names, { capitalizeFirst = true } = {}) {
  const normalized = (Array.isArray(names) ? names : []).filter(Boolean).map((name) => {
    const trimmed = String(name).trim();
    return capitalizeFirst ? capitalize(trimmed) : trimmed;
  });
  normalized.forEach((name, index) => {
    if (index > 0) {
      segments.push(segment(index === normalized.length - 1 ? ' and ' : ', ', 'plain'));
    }
    segments.push(segment(name, 'flower'));
  });
}

function combineSentenceSegments(sentences) {
  const merged = [];
  sentences.forEach((sentence, index) => {
    if (!sentence || sentence.length === 0) return;
    if (index > 0 && merged.length) {
      merged.push(segment(' ', 'plain'));
    }
    sentence.forEach((part) => merged.push(normalizeTokenSegment(part)));
  });
  return merged;
}

function capitalize(value) {
  if (typeof value !== 'string' || !value.length) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pluralize(word, count) {
  return count === 1 ? word : `${word}s`;
}