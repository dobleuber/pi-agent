export type RouterState = "off" | "on";
export type RouterLocalMode = "off" | "on";
export type RouterFallbackMode = "passthrough" | "passthrough-with-warning" | "error";

export interface RouterModelConfig {
	provider: string;
	model: string;
	baseUrl: string;
	timeoutMs: number;
	fallbackMode: RouterFallbackMode;
	maxInputChars: number;
	fallbackModels?: string[];
}

export interface RouterModelProfiles {
	local: RouterModelConfig;
	remote: RouterModelConfig;
}

export interface RouterConfig {
	state: RouterState;
	localMode: RouterLocalMode;
	routerModels: RouterModelProfiles;
	/** @deprecated Use resolveRouterModel(config) instead. */
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
	degradedReason?: string | null;
}

const LOCAL_ROUTER_MODEL: RouterModelConfig = {
	provider: "llama-cpp",
	model: "gemma4",
	baseUrl: "http://127.0.0.1:11434/v1",
	timeoutMs: 15000,
	fallbackMode: "passthrough-with-warning",
	maxInputChars: 12000,
};

const REMOTE_ROUTER_MODEL: RouterModelConfig = {
	provider: "openai-codex",
	model: "gpt-5.4-nano",
	baseUrl: "https://chatgpt.com/backend-api",
	timeoutMs: 15000,
	fallbackMode: "passthrough-with-warning",
	maxInputChars: 12000,
	fallbackModels: ["gpt-5.4-mini"],
};

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
	state: "off",
	localMode: "on",
	routerModels: {
		local: LOCAL_ROUTER_MODEL,
		remote: REMOTE_ROUTER_MODEL,
	},
	routerModel: LOCAL_ROUTER_MODEL,
};

export function resolveRouterModel(config: Pick<RouterConfig, "localMode" | "routerModels">): RouterModelConfig {
	return config.localMode === "off" ? config.routerModels.remote : config.routerModels.local;
}

export function resolveRouterState(
	config: Pick<RouterConfig, "state">,
	overrides: RouterStateOverrides = {},
): ResolvedRouterState {
	if (overrides.singlePromptBypass) {
		return { state: "off", reason: "single prompt bypass" };
	}
	if (overrides.sessionState !== undefined) {
		return { state: overrides.sessionState, reason: "session override" };
	}
	return { state: config.state, reason: "global default" };
}

export function routerStatusSummary(input: RouterStatusInput): string {
	const activeRouterModel = resolveRouterModel(input.config);
	const routerModel = formatModel(activeRouterModel.provider, activeRouterModel.model);
	const workModel = formatModel(input.workModel?.provider, input.workModel?.model);
	const parts = [`router:${input.config.state}`, `local:${input.config.localMode}`, `routerModel:${routerModel}`, `workModel:${workModel}`];
	if (input.degradedReason) {
		parts.push(`degraded:${input.degradedReason}`);
	}
	return parts.join(" ");
}

function formatModel(provider?: string, model?: string): string {
	if (!provider && !model) return "unknown";
	if (!provider) return model ?? "unknown";
	if (!model) return provider;
	return `${provider}/${model}`;
}
