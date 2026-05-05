import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAuthHeaders,
  createStratusClient,
  formatModelResults,
  getRequiredApiKey,
} from '../client.js';

test('getRequiredApiKey throws a clear error when STRATUS_API_KEY is missing', () => {
  assert.throws(
    () => getRequiredApiKey({}),
    /STRATUS_API_KEY/i,
  );
});

test('buildAuthHeaders includes bearer token when key exists', () => {
  assert.deepEqual(buildAuthHeaders('abc123'), {
    Authorization: 'Bearer abc123',
    'Content-Type': 'application/json',
  });
});

test('getRequiredApiKey can recover the Windows user env key when running under WSL', () => {
  const apiKey = getRequiredApiKey(
    { WSL_DISTRO_NAME: 'Ubuntu-22.04' },
    { readWindowsEnv: () => 'from-windows-env' },
  );

  assert.equal(apiKey, 'from-windows-env');
});

test('formatModelResults trims results to the requested cap', () => {
  const text = formatModelResults(
    [
      { id: 'one' },
      { id: 'two' },
      { id: 'three' },
    ],
    2,
  );

  assert.match(text, /^1\. one\n2\. two$/);
});

test('createStratusClient fetches and filters remote models', async () => {
  const fetchCalls = [];
  const fetchImpl = async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      async json() {
        return {
          data: [
            { id: 'stratus-x1ac-xl-z-ai/glm-5.1' },
            { id: 'other-model' },
          ],
        };
      },
    };
  };

  const client = createStratusClient({ apiKey: 'secret', fetchImpl });
  const models = await client.fetchModels('glm-5.1');

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'https://api.stratus.run/v1/models');
  assert.equal(fetchCalls[0].options.headers.Authorization, 'Bearer secret');
  assert.deepEqual(models, [{ id: 'stratus-x1ac-xl-z-ai/glm-5.1' }]);
});
