const COMPLEX_KEYWORDS = [
  /\bimplement(a|ar|e|acion|ation)?\b/i,
  /\brefactor(iza|izar|ing)?\b/i,
  /\bmigra(r|cion|tion)?\b/i,
  /\bdiseñ(a|ar|o)\b/i,
  /\bdesign\b/i,
  /\barchitect(ure|ura|ural)?\b/i,
  /\bdebug(ging)?\b/i,
  /\binvestiga(r|te|tion)?\b/i,
  /\bverifica(r|cion|tion)?\b/i,
  /\btests?\b/i,
  /\bpruebas?\b/i,
  /\bintegra(r|cion|tion)?\b/i,
  /\bworkflow\b/i,
  /\bplan\b/i,
  /\bmulti[- ]?step\b/i,
  /\bvarios?\b/i,
  /\bcomplej[ao]s?\b/i,
];

const SIMPLE_PROMPT_MAX_CHARS = 180;
const COMPLEX_SCORE_THRESHOLD = 3;

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function splitClauses(text) {
  return text
    .split(/(?:\n+|[.;]|\s+(?:y|e|and|then|luego|despues|después)\s+)/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function classifyComplexTask(prompt) {
  const text = String(prompt ?? '').trim();
  const reasons = [];
  let score = 0;

  if (!text) {
    return { complex: false, score, reasons };
  }

  if (text.length >= 500) {
    score += 2;
    reasons.push('long prompt');
  } else if (text.length >= SIMPLE_PROMPT_MAX_CHARS) {
    score += 1;
    reasons.push('medium prompt');
  }

  const lineCount = text.split(/\n/).filter((line) => line.trim()).length;
  if (lineCount >= 4) {
    score += 2;
    reasons.push('multi-line task');
  }

  const keywordHits = countMatches(text, COMPLEX_KEYWORDS);
  if (keywordHits >= 3) {
    score += 3;
    reasons.push('multiple complex-task keywords');
  } else if (keywordHits > 0) {
    score += keywordHits;
    reasons.push('complex-task keyword');
  }

  const clauses = splitClauses(text);
  if (clauses.length >= 4) {
    score += 2;
    reasons.push('multiple requested steps');
  } else if (clauses.length >= 3) {
    score += 1;
    reasons.push('several requested steps');
  }

  if (/\b(edge cases?|casos borde|tests?|pruebas?|verifica|verify|validat(e|a))\b/i.test(text)
    && /\b(implement|refactor|migra|diseñ|design|fix|arregla|debug)\b/i.test(text)) {
    score += 2;
    reasons.push('implementation plus verification');
  }

  return {
    complex: score >= COMPLEX_SCORE_THRESHOLD,
    score,
    reasons,
  };
}

export function shouldAutoRollout(prompt) {
  return classifyComplexTask(prompt).complex;
}

export function buildRolloutGoal(prompt) {
  const task = String(prompt ?? '').trim();
  return [
    'Create a concise, actionable execution plan for this complex coding-agent task.',
    'Focus on sequencing, verification, risks, and the minimum useful steps before implementation.',
    '',
    'User task:',
    task,
  ].join('\n');
}

function stripNumberedPrefix(line) {
  return line.replace(/^\s*\d+[.)]\s*/, '').trim();
}

export function buildRolloutSummary(planText, maxSteps = 3) {
  const steps = String(planText ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^\d+[.)]\s+/.test(line))
    .map(stripNumberedPrefix)
    .filter(Boolean)
    .slice(0, maxSteps);

  if (steps.length > 0) return steps.join(' → ');

  const fallback = String(planText ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => line && !/^Goal:/i.test(line));

  return fallback ? fallback.slice(0, 180) : 'No rollout steps returned.';
}

export function buildAutoRolloutMessage(planText, classification) {
  const summary = buildRolloutSummary(planText);

  return {
    customType: 'stratus-rollout-plan',
    content: [
      'Stratus rollout plan for this complex task:',
      `Summary: ${summary}`,
      '',
      String(planText ?? '').trim(),
      '',
      'Use this plan as planning context. Adapt it when repository evidence contradicts it; do not treat it as a substitute for verification.',
    ].join('\n'),
    display: true,
    details: {
      summary,
      score: classification?.score ?? 0,
      reasons: classification?.reasons ?? [],
    },
  };
}
