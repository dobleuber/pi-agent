import { execFileSync } from 'node:child_process';

import { searchModels } from './models.js';

export const DEFAULT_STRATUS_BASE_URL = 'https://api.stratus.run/v1';

function isWslEnv(env) {
  return Boolean(env?.WSL_DISTRO_NAME || env?.PI_PROFILE_RUNTIME === 'wsl' || env?.PI_PROFILE_SHELL_RUNTIME === 'wsl');
}

function readWindowsEnvViaCmd(name) {
  if (!/^[A-Z0-9_]+$/i.test(name)) return '';

  try {
    return execFileSync('cmd.exe', ['/d', '/s', '/c', `if defined ${name} (echo %${name}%)`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    }).trim();
  } catch {
    return '';
  }
}

export function getRequiredApiKey(env = process.env, options = {}) {
  const apiKey = env?.STRATUS_API_KEY;
  if (apiKey) return apiKey;

  const windowsApiKey = isWslEnv(env)
    ? (options.readWindowsEnv?.('STRATUS_API_KEY') ?? readWindowsEnvViaCmd('STRATUS_API_KEY'))
    : '';
  if (windowsApiKey) return windowsApiKey;

  throw new Error('STRATUS_API_KEY is required to use the Stratus extension');
}

export function buildAuthHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export function formatModelResults(models, maxResults = 20) {
  return (models ?? [])
    .slice(0, maxResults)
    .map((model, index) => `${index + 1}. ${model.id}`)
    .join('\n');
}

async function parseJson(response) {
  return response.json();
}

async function assertOk(response, action) {
  if (response.ok) return;

  let details = '';
  try {
    const body = await response.text();
    if (body) details = `: ${body}`;
  } catch {}

  throw new Error(`Stratus ${action} failed with HTTP ${response.status}${details}`);
}

export async function fetchStratusModels(apiKey, fetchImpl = fetch, baseUrl = DEFAULT_STRATUS_BASE_URL) {
  const response = await fetchImpl(`${baseUrl}/models`, {
    headers: buildAuthHeaders(apiKey),
  });
  await assertOk(response, 'model fetch');
  const payload = await parseJson(response);
  return payload?.data ?? [];
}

export function createStratusClient({
  apiKey = getRequiredApiKey(process.env),
  fetchImpl = fetch,
  baseUrl = DEFAULT_STRATUS_BASE_URL,
} = {}) {
  return {
    async fetchModels(query = '') {
      const models = await fetchStratusModels(apiKey, fetchImpl, baseUrl);
      return searchModels(models, query);
    },

    async embeddings(body) {
      const response = await fetchImpl(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: buildAuthHeaders(apiKey),
        body: JSON.stringify(body),
      });
      await assertOk(response, 'embeddings request');
      return parseJson(response);
    },

    async rollout(body) {
      const response = await fetchImpl(`${baseUrl}/rollout`, {
        method: 'POST',
        headers: buildAuthHeaders(apiKey),
        body: JSON.stringify(body),
      });
      await assertOk(response, 'rollout request');
      return parseJson(response);
    },
  };
}
