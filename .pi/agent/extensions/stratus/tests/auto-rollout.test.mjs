import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAutoRolloutMessage,
  buildRolloutGoal,
  buildRolloutSummary,
  classifyComplexTask,
  shouldAutoRollout,
} from '../auto-rollout.js';

test('classifyComplexTask ignores simple informational prompts', () => {
  const result = classifyComplexTask('que hora es?');

  assert.equal(result.complex, false);
  assert.equal(shouldAutoRollout('que hora es?'), false);
});

test('classifyComplexTask treats implementation tasks with verification as complex', () => {
  const prompt = 'Implementa soporte de autenticacion OAuth, actualiza los tests, verifica edge cases y documenta el flujo.';
  const result = classifyComplexTask(prompt);

  assert.equal(result.complex, true);
  assert.equal(shouldAutoRollout(prompt), true);
  assert.ok(result.score >= 3);
  assert.ok(result.reasons.length > 0);
});

test('buildRolloutGoal preserves the user task and asks for an actionable plan', () => {
  const goal = buildRolloutGoal('Refactoriza el sistema de pagos');

  assert.match(goal, /Refactoriza el sistema de pagos/);
  assert.match(goal, /actionable/i);
});

test('buildRolloutSummary extracts a compact summary from formatted rollout text', () => {
  const summary = buildRolloutSummary('Goal: x\n\n1. inspect repository\n2. implement minimal change\n3. run tests\n4. report evidence');

  assert.equal(summary, 'inspect repository → implement minimal change → run tests');
});

test('buildAutoRolloutMessage creates injected planning context with summary', () => {
  const message = buildAutoRolloutMessage('Goal: x\n\n1. inspect\n2. implement', {
    score: 4,
    reasons: ['implementation keyword'],
  });

  assert.equal(message.customType, 'stratus-rollout-plan');
  assert.equal(message.display, true);
  assert.match(message.content, /Stratus rollout plan/);
  assert.match(message.content, /Summary: inspect → implement/);
  assert.match(message.content, /1\. inspect/);
  assert.equal(message.details.summary, 'inspect → implement');
  assert.deepEqual(message.details.reasons, ['implementation keyword']);
});
