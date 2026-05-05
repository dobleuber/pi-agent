export const ALLOWED_MODEL_IDS = [
  'stratus-x1ac-xl-z-ai/glm-5.1',
  'stratus-x1ac-xl-z-ai/glm-5v-turbo',
  'stratus-x1ac-xl-minimax/minimax-m2.7',
  'stratus-x1ac-xl-minimax/minimax-m2.5:free',
];

const MODEL_METADATA = {
  'stratus-x1ac-xl-z-ai/glm-5.1': {
    name: 'Stratus GLM-5.1',
    reasoning: true,
    input: ['text'],
    contextWindow: 200000,
    maxTokens: 131072,
  },
  'stratus-x1ac-xl-z-ai/glm-5v-turbo': {
    name: 'Stratus GLM-5V Turbo',
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 200000,
    maxTokens: 131072,
  },
  'stratus-x1ac-xl-minimax/minimax-m2.7': {
    name: 'Stratus MiniMax M2.7',
    reasoning: true,
    input: ['text'],
    contextWindow: 204800,
    maxTokens: 131072,
  },
  'stratus-x1ac-xl-minimax/minimax-m2.5:free': {
    name: 'Stratus MiniMax M2.5 Free',
    reasoning: true,
    input: ['text'],
    contextWindow: 196608,
    maxTokens: 8192,
  },
};

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

export function resolveAllowedModels(remoteModels) {
  const byId = new Map((remoteModels ?? []).map((model) => [model.id, model]));
  return ALLOWED_MODEL_IDS.map((id) => byId.get(id)).filter(Boolean);
}

export function searchModels(remoteModels, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return [...(remoteModels ?? [])];

  return (remoteModels ?? []).filter((model) => model.id.toLowerCase().includes(needle));
}

export function buildProviderModels(remoteModels) {
  return resolveAllowedModels(remoteModels).map((model) => {
    const metadata = MODEL_METADATA[model.id];
    return {
      id: model.id,
      name: metadata.name,
      reasoning: metadata.reasoning,
      input: [...metadata.input],
      cost: { ...ZERO_COST },
      contextWindow: metadata.contextWindow,
      maxTokens: metadata.maxTokens,
    };
  });
}
