import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_MODEL_IDS,
  buildProviderModels,
  resolveAllowedModels,
  searchModels,
} from '../models.js';

const remoteModels = [
  { id: 'stratus-x1ac-xl-z-ai/glm-5.1' },
  { id: 'stratus-x1ac-xl-z-ai/glm-5v-turbo' },
  { id: 'stratus-x1ac-xl-minimax/minimax-m2.7' },
  { id: 'stratus-x1ac-xl-minimax/minimax-m2.5:free' },
  { id: 'stratus-x1ac-base-z-ai/glm-5.1' },
];

test('resolveAllowedModels returns exactly the four allowed xl models in allowlist order', () => {
  const resolved = resolveAllowedModels(remoteModels);

  assert.deepEqual(
    resolved.map((model) => model.id),
    ALLOWED_MODEL_IDS,
  );
});

test('searchModels is case-insensitive and returns matching ids', () => {
  const matches = searchModels(remoteModels, 'GLM-5V');

  assert.deepEqual(matches.map((model) => model.id), ['stratus-x1ac-xl-z-ai/glm-5v-turbo']);
});

test('resolveAllowedModels omits missing allowlist entries instead of throwing', () => {
  const resolved = resolveAllowedModels([{ id: 'stratus-x1ac-xl-z-ai/glm-5.1' }]);

  assert.deepEqual(resolved.map((model) => model.id), ['stratus-x1ac-xl-z-ai/glm-5.1']);
});

test('buildProviderModels creates provider-ready model metadata', () => {
  const providerModels = buildProviderModels(remoteModels);

  assert.equal(providerModels.length, 4);
  assert.deepEqual(providerModels[0], {
    id: 'stratus-x1ac-xl-z-ai/glm-5.1',
    name: 'Stratus GLM-5.1',
    reasoning: true,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 131072,
  });
  assert.deepEqual(providerModels[1].input, ['text', 'image']);
});
