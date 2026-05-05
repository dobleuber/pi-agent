import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { Text } from '@mariozechner/pi-tui';
import { Type } from '@sinclair/typebox';

import { createStratusClient, formatModelResults, getRequiredApiKey } from './client.js';
import { ALLOWED_MODEL_IDS, buildProviderModels } from './models.js';
import { formatRolloutText } from './rollout.js';
import { buildAutoRolloutMessage, buildRolloutGoal, buildRolloutSummary, classifyComplexTask } from './auto-rollout.js';

const PROVIDER_NAME = 'stratus';
const BASE_URL = 'https://api.stratus.run/v1';
const PROVIDER_MODELS = buildProviderModels(ALLOWED_MODEL_IDS.map((id) => ({ id })));
const STATUS_KEY = 'stratus';
const WIDGET_KEY = 'stratus-rollout';

function renderTextLines(models, query) {
  if (!models.length) {
    return query
      ? `No Stratus models matched query: ${query}`
      : 'No Stratus models were returned by the API.';
  }

  return formatModelResults(models, 50);
}

function printOrNotify(ctx, message, level = 'info') {
  if (ctx.hasUI) {
    ctx.ui.notify(message, level);
    return;
  }

  console.log(message);
}

function clearStratusIndicator(ctx) {
  if (!ctx.hasUI) return;
  ctx.ui.setStatus(STATUS_KEY, undefined);
  ctx.ui.setWidget(WIDGET_KEY, undefined);
}

function setStratusIndicator(ctx, state, summary = '') {
  if (!ctx.hasUI) return;

  const theme = ctx.ui.theme;
  const statusByState = {
    planning: theme.fg('accent', '☁ Stratus planning…'),
    active: theme.fg('success', '☁ Stratus plan active'),
    skipped: theme.fg('warning', '☁ Stratus skipped'),
  };

  ctx.ui.setStatus(STATUS_KEY, statusByState[state] ?? statusByState.active);

  if (!summary) return;
  const color = state === 'skipped' ? 'warning' : state === 'planning' ? 'accent' : 'success';
  ctx.ui.setWidget(WIDGET_KEY, [
    theme.fg(color, theme.bold('☁ Stratus rollout')),
    theme.fg('muted', summary),
  ]);
}

export default function stratusExtension(pi: ExtensionAPI) {
  pi.registerMessageRenderer('stratus-rollout-plan', (message, _options, theme) => {
    const summary = message.details?.summary ? ` ${message.details.summary}` : '';
    return new Text(
      theme.fg('accent', theme.bold('[Stratus rollout]')) + theme.fg('muted', summary) + '\n' + theme.fg('toolOutput', message.content),
      0,
      0,
    );
  });

  pi.registerProvider(PROVIDER_NAME, {
    baseUrl: BASE_URL,
    apiKey: 'STRATUS_API_KEY',
    api: 'openai-completions',
    models: PROVIDER_MODELS,
  });

  pi.on('session_start', async (_event, ctx) => {
    if (!ctx.hasUI) return;

    try {
      getRequiredApiKey(process.env);
    } catch {
      ctx.ui.notify('STRATUS_API_KEY is not set. Stratus tools and /stratus-models will require it.', 'warning');
    }
  });

  pi.on('before_agent_start', async (event, ctx) => {
    const classification = classifyComplexTask(event.prompt);
    if (!classification.complex) {
      clearStratusIndicator(ctx);
      return;
    }

    setStratusIndicator(ctx, 'planning', 'Detectada tarea compleja; generando plan…');

    try {
      const client = createStratusClient();
      const response = await client.rollout({
        goal: buildRolloutGoal(event.prompt),
        max_steps: 8,
        return_intermediate: true,
      });
      const planText = formatRolloutText(response, event.prompt);
      const summary = buildRolloutSummary(planText);

      setStratusIndicator(ctx, 'active', summary);
      if (ctx.hasUI) {
        ctx.ui.notify(`Stratus rollout plan added: ${summary}`, 'info');
      }

      return {
        message: buildAutoRolloutMessage(planText, classification),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStratusIndicator(ctx, 'skipped', message.slice(0, 180));
      if (ctx.hasUI) {
        ctx.ui.notify(`Stratus auto-rollout skipped: ${message}`, 'warning');
      } else {
        console.warn(`Stratus auto-rollout skipped: ${message}`);
      }
    }
  });

  pi.registerTool({
    name: 'stratus_search_models',
    label: 'Stratus Search Models',
    description: 'Searches the remote Stratus catalog and returns matching model ids.',
    promptSnippet: 'Search the remote Stratus catalog for model ids.',
    promptGuidelines: [
      'Use stratus_search_models when the user asks which Stratus models are available or wants to find a specific Stratus model id.',
    ],
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: 'Case-insensitive search query' })),
      maxResults: Type.Optional(Type.Number({ description: 'Maximum number of results', default: 20, minimum: 1, maximum: 100 })),
    }),
    async execute(_toolCallId, params) {
      const client = createStratusClient();
      const models = await client.fetchModels(params.query ?? '');
      const limited = models.slice(0, params.maxResults ?? 20);

      return {
        content: [{ type: 'text', text: renderTextLines(limited, params.query ?? '') }],
        details: { query: params.query ?? '', count: limited.length, models: limited },
      };
    },
  });

  pi.registerTool({
    name: 'stratus_embeddings',
    label: 'Stratus Embeddings',
    description: 'Generates semantic embeddings using Stratus /v1/embeddings.',
    promptSnippet: 'Generate semantic embeddings through Stratus.',
    promptGuidelines: [
      'Use stratus_embeddings when the user explicitly asks for embeddings, similarity vectors, or semantic indexing via Stratus.',
    ],
    parameters: Type.Object({
      input: Type.Union([
        Type.String({ description: 'Single text input' }),
        Type.Array(Type.String(), { description: 'Multiple text inputs' }),
      ]),
      model: Type.Optional(Type.String({ description: 'Embedding model id' })),
      encoding_format: Type.Optional(Type.Union([Type.Literal('float'), Type.Literal('base64')], { description: 'Embedding encoding format' })),
    }),
    async execute(_toolCallId, params) {
      const client = createStratusClient();
      const response = await client.embeddings(params);
      const count = Array.isArray(response?.data) ? response.data.length : 0;

      return {
        content: [{ type: 'text', text: `Generated ${count} Stratus embedding${count === 1 ? '' : 's'}.` }],
        details: response,
      };
    },
  });

  pi.registerTool({
    name: 'stratus_rollout',
    label: 'Stratus Rollout',
    description: 'Runs Stratus rollout planning through /v1/rollout.',
    promptSnippet: 'Generate a multi-step plan with Stratus rollout.',
    promptGuidelines: [
      'Use stratus_rollout when the user explicitly asks for planning, rollout simulation, or a multi-step Stratus plan.',
    ],
    parameters: Type.Object({
      goal: Type.String({ description: 'Goal state to reach' }),
      initial_state: Type.Optional(Type.String({ description: 'Optional initial state' })),
      max_steps: Type.Optional(Type.Number({ description: 'Maximum rollout steps', default: 10, minimum: 1, maximum: 50 })),
      return_intermediate: Type.Optional(Type.Boolean({ description: 'Whether to return intermediate states', default: true })),
    }),
    async execute(_toolCallId, params) {
      const client = createStratusClient();
      const response = await client.rollout(params);

      return {
        content: [{ type: 'text', text: formatRolloutText(response, params.goal) }],
        details: response,
      };
    },
  });

  pi.registerCommand('stratus-models', {
    description: 'List/search remote Stratus models. Usage: /stratus-models [query]',
    handler: async (args, ctx) => {
      try {
        const client = createStratusClient();
        const query = args.trim();
        const models = await client.fetchModels(query);
        const text = renderTextLines(models.slice(0, 50), query);
        printOrNotify(ctx, text, models.length ? 'info' : 'warning');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        printOrNotify(ctx, `Stratus error: ${message}`, 'error');
      }
    },
  });
}
