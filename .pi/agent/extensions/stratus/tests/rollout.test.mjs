import test from 'node:test';
import assert from 'node:assert/strict';

import { formatRolloutText } from '../rollout.js';

test('formatRolloutText renders action_sequence responses from the live rollout API shape', () => {
  const text = formatRolloutText({
    goal: 'book a hotel room',
    action_sequence: [
      { step: 1, action_name: 'think', action_category: 'communication' },
      { step: 2, action_name: 'search_hotels', action_category: 'browser' },
    ],
  }, 'fallback goal');

  assert.equal(
    text,
    'Goal: book a hotel room\n\n1. think\n2. search_hotels',
  );
});

test('formatRolloutText still supports legacy steps responses', () => {
  const text = formatRolloutText({
    goal: 'book a hotel room',
    steps: [
      { action: 'search hotels' },
      { description: 'compare prices' },
    ],
  }, 'fallback goal');

  assert.equal(
    text,
    'Goal: book a hotel room\n\n1. search hotels\n2. compare prices',
  );
});

test('formatRolloutText falls back cleanly when no steps are present', () => {
  const text = formatRolloutText({}, 'fallback goal');

  assert.equal(text, 'Goal: fallback goal\n\nNo steps returned.');
});
