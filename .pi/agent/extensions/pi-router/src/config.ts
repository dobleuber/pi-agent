export type RouterState = "off" | "on";
export type RouterFallbackMode = "passthrough" | "passthrough-with-warning" | "error";

export interface RouterModelConfig {
	provider: string;
	model: string;
	timeoutMs: number;
	fallbackMode: RouterFallbackMode;
	maxInputChars: number;
}

export interface RouterConfig {
	state: RouterState;
	routerModel: RouterModelConfig;
}

export interface RouterStateOverrides {
	sessionState?: RouterState;
	singlePromptBypass?: boolean;
}

export interface ResolvedRouterState {
	state: RouterState;
	reason: string;
}

export interface WorkModelInfo {
	provider?: string;
	model?: string;
}

export interface RouterStatusInput {
	config: RouterConfig;
	workModel?: WorkModelInfo | null;
	effectiveRouterModel?: WorkModelInfo | null;
	degradedReason?: string | null;
}

const REMOTE_ROUTER_MODEL: RouterModelConfig = {
	provider: "openai-codex",
	model: "gpt-5.4-mini",
	timeoutMs: 15000,
	fallbackMode: "passthrough-with-warning",
	maxInputChars: 12000,
};

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
	state: "off",
	routerModel: REMOTE_ROUTER_MODEL,
};

export function resolveRouterState(
	config: Pick<RouterConfig, "state">,
	overrides: RouterStateOverrides = {},
): ResolvedRouterState {
	if (overrides.singlePromptBypass) return { state: "off", reason: "single prompt bypass" };
	if (overrides.sessionState !== undefined) return { state: overrides.sessionState, reason: "session override" };
	return { state: config.state, reason: "global default" };
}

export function routerStatusSummary(input: RouterStatusInput): string {
	const routerModel = input.effectiveRouterModel
		? formatModel(input.effectiveRouterModel.provider, input.effectiveRouterModel.model)
		: formatModel(input.config.routerModel.provider, input.config.routerModel.model);
	const workModel = formatModel(input.workModel?.provider, input.workModel?.model);
	const parts = [`router:${input.config.state}`, `routerModel:${routerModel}`, `workModel:${workModel}`];
	if (input.degradedReason) parts.push(`degraded:${input.degradedReason}`);
	return parts.join(" ");
}

export function formatModel(provider?: string, model?: string): string {
	if (!provider && !model) return "unknown";
	if (!provider) return model ?? "unknown";
	if (!model) return provider;
	return `${provider}/${model}`;
}
