import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_ROUTER_CONFIG, formatModel, resolveRouterModel, routerStatusSummary, type RouterConfig, type WorkModelInfo } from "./config.ts";
import { extendRouterDetailsAfterCompletion, type RouterDetailsEntry } from "./details.ts";
import { translateFinalAnswerToSpanish, type FinalAnswerTranslationResult } from "./final-answer.ts";
import { shouldRouteInput } from "./input.ts";
import { prepareRoutedPrompt, type PrepareRoutedPromptInput } from "./pipeline.ts";
import { resolvePiRouterModel } from "./pi-ai-client.ts";
import { routePromptWithModel } from "./router-model.ts";
import { createLocalRouterLifecycle, type LocalRouterLifecycle } from "./local-lifecycle.ts";
import { createFileRouterStateStore, type RouterStateStore } from "./state.ts";
import { selectedWorkModelFromPiContext } from "./work-model.ts";

export interface PiRouterDependencies {
	config?: RouterConfig;
	routePrompt?: PrepareRoutedPromptInput["routePrompt"];
	translateFinalAnswer?: (answer: string, config: RouterConfig["routerModel"], ctx?: any) => Promise<FinalAnswerTranslationResult>;
	stateStore?: RouterStateStore;
	localLifecycle?: LocalRouterLifecycle;
	promptPreparationPhrases?: readonly string[];
	pickPromptPreparationPhrase?: (phrases: readonly string[], previous?: string) => string;
	setInterval?: (callback: () => void, delay: number) => any;
	clearInterval?: (interval: any) => void;
}

const PROMPT_PREPARATION_PHRASES = [
	"Untangling the prompt…",
	"Packing the context…",
	"Polishing the question…",
	"Lining up the instructions…",
	"Teaching the prompt some manners…",
	"Sharpening the request…",
	"Transmuting intent into instructions…",
	"Getting the prompt road-ready…",
] as const;

export function pickPromptPreparationPhrase(phrases: readonly string[], previous?: string, random: () => number = Math.random): string {
	if (phrases.length === 0) return "Preparing the prompt…";
	const candidates = phrases.length > 1 && previous !== undefined
		? phrases.filter((phrase) => phrase !== previous)
		: phrases;
	return candidates[Math.floor(random() * candidates.length)];
}

function statusColor(ctx: any, color: "accent" | "dim" | "muted" | "warning", text: string): string {
	return ctx?.ui?.theme?.fg ? ctx.ui.theme.fg(color, text) : text;
}

function routerIdleStatus(state: RouterConfig["state"], ctx: any): string {
	return state === "on"
		? `${statusColor(ctx, "accent", "◆")} Router on`
		: statusColor(ctx, "muted", "◇ Router off");
}

function promptPreparationStatus(message: string, ctx: any): string {
	return `${statusColor(ctx, "accent", "◆")} ${message}`;
}

function thinkingStatus(level: string, degraded: boolean, ctx: any): string {
	const levelText = statusColor(ctx, "dim", `· ${level}`);
	const degradedText = degraded ? ` ${statusColor(ctx, "warning", "· degraded")}` : "";
	return `${statusColor(ctx, "accent", "◆")} Thinking ${levelText}${degradedText}`;
}

function degradedStatus(ctx: any): string {
	return statusColor(ctx, "warning", "◇ Router degraded");
}

interface PendingRoutedTurn {
	details: RouterDetailsEntry;
	shouldTranslateFinalAnswer: boolean;
}

function extractSingleTextContent(content: unknown): string | null {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		const textParts = content.filter((part) => part && typeof part === "object" && (part as any).type === "text");
		if (textParts.length !== 1) return null;
		if (typeof (textParts[0] as any).text !== "string") return null;
		return (textParts[0] as any).text;
	}
	return null;
}

function hasPotentialFinalAnswerText(content: unknown): boolean {
	if (typeof content === "string") return content.trim().length > 0;
	if (Array.isArray(content)) {
		return content.some((part) => part && typeof part === "object" && (part as any).type === "text");
	}
	return false;
}

function hasToolCallContent(content: unknown): boolean {
	return Array.isArray(content) && content.some((part) => part && typeof part === "object" && (part as any).type === "toolCall");
}

function replaceTextContent(content: unknown, text: string): unknown {
	if (typeof content === "string") return text;
	if (Array.isArray(content)) {
		let replaced = false;
		return content.map((part) => {
			if (!replaced && part && typeof part === "object" && (part as any).type === "text") {
				replaced = true;
				return { ...part, text };
			}
			return part;
		});
	}
	return [{ type: "text", text }];
}

function completeSkippedFinalAnswer(entry: RouterDetailsEntry, reason: string): RouterDetailsEntry {
	return extendRouterDetailsAfterCompletion(entry, {
		englishAnswer: "",
		spanishAnswer: "",
		fallbackEvents: [reason],
	});
}

function refreshActiveRouterModel(config: RouterConfig): RouterConfig {
	return { ...config, routerModel: resolveRouterModel(config) };
}

function effectiveRouterModelFromContext(config: RouterConfig, ctx: any): WorkModelInfo | null {
	if (config.routerModel.provider !== "openai-codex") {
		return { provider: config.routerModel.provider, model: config.routerModel.model };
	}
	if (!ctx?.modelRegistry) {
		return { provider: config.routerModel.provider, model: config.routerModel.model };
	}
	const resolved = resolvePiRouterModel(config.routerModel, ctx.modelRegistry);
	return resolved ? { provider: resolved.provider, model: resolved.id } : { provider: config.routerModel.provider, model: config.routerModel.model };
}

function remoteRouterModelLabel(config: RouterConfig, ctx: any): string {
	const effectiveRouterModel = effectiveRouterModelFromContext(config, ctx);
	return formatModel(effectiveRouterModel?.provider, effectiveRouterModel?.model);
}

export default function piRouterExtension(pi: ExtensionAPI) {
	installPiRouter(pi, {});
}

export function installPiRouter(pi: ExtensionAPI, dependencies: PiRouterDependencies = {}) {
	const stateStore = dependencies.stateStore ?? createFileRouterStateStore();
	const localLifecycle = dependencies.localLifecycle ?? createLocalRouterLifecycle();
	const initialConfig = dependencies.config ?? DEFAULT_ROUTER_CONFIG;
	const pendingRoutedTurns: PendingRoutedTurn[] = [];

	function loadPersistedConfig(): Partial<Pick<RouterConfig, "state" | "localMode">> {
		const persistedState = stateStore.loadState();
		return typeof persistedState === "string" ? { state: persistedState } : (persistedState ?? {});
	}

	function configFromPersistedState(persistedConfig: Partial<Pick<RouterConfig, "state" | "localMode">>): RouterConfig {
		const selectedLocalMode = (persistedConfig.localMode ?? initialConfig.localMode) as RouterConfig["localMode"];
		const routerModels = dependencies.config?.routerModel
			? { ...initialConfig.routerModels, [selectedLocalMode === "off" ? "remote" : "local"]: dependencies.config.routerModel }
			: initialConfig.routerModels;
		return refreshActiveRouterModel({ ...initialConfig, routerModels, ...persistedConfig });
	}

	function refreshRouterSettingsFromStore() {
		config = configFromPersistedState(loadPersistedConfig());
	}

	let config: RouterConfig = configFromPersistedState(loadPersistedConfig());

	function saveRouterSettings() {
		stateStore.saveState({ state: config.state, localMode: config.localMode });
	}

	function setRouterState(state: RouterConfig["state"], ctx: any) {
		refreshRouterSettingsFromStore();
		config = refreshActiveRouterModel({ ...config, state });
		saveRouterSettings();
		ctx.ui.setStatus("pi-router", routerIdleStatus(config.state, ctx));
	}

	async function setLocalMode(localMode: RouterConfig["localMode"], ctx: any) {
		refreshRouterSettingsFromStore();
		config = refreshActiveRouterModel({ ...config, localMode });
		saveRouterSettings();
		if (localMode === "on") {
			const result = await localLifecycle.ensureRunning(config.routerModels.local);
			if (result.status === "error") {
				ctx.ui.notify(`Pi router local mode enabled; failed to start local llama.cpp router model: ${result.message ?? "unknown error"}`, "warning");
				return;
			}
			const action = result.status === "started" ? "started local llama.cpp router model" : "local llama.cpp router model already running";
			ctx.ui.notify(`Pi router local mode enabled; ${action}`, "info");
			return;
		}
		const result = await localLifecycle.stop(config.routerModels.local);
		const remoteModel = remoteRouterModelLabel(config, ctx);
		if (result.status === "error") {
			ctx.ui.notify(`Pi router local mode disabled; using remote ${remoteModel} router model; failed to stop local llama.cpp router model: ${result.message ?? "unknown error"}`, "warning");
			return;
		}
		ctx.ui.notify(`Pi router local mode disabled; using remote ${remoteModel} router model`, "info");
	}

	pi.registerCommand("router", {
		description: "Show or change Pi router status: /router, /router on, /router off, /router local on, /router local off",
		handler: async (args, ctx) => {
			refreshRouterSettingsFromStore();
			const command = args.trim().toLowerCase();
			if (command === "on") {
				setRouterState("on", ctx);
				ctx.ui.notify("Pi router enabled", "info");
				return;
			}
			if (command === "off") {
				setRouterState("off", ctx);
				ctx.ui.notify("Pi router disabled", "info");
				return;
			}
			if (command === "local on") {
				await setLocalMode("on", ctx);
				return;
			}
			if (command === "local off") {
				await setLocalMode("off", ctx);
				return;
			}
			if (command === "local" || command.startsWith("local ")) {
				ctx.ui.notify(`router local:${config.localMode} usage:/router local on|off`, "info");
				return;
			}
			ctx.ui.notify(routerStatusSummary({ config, effectiveRouterModel: effectiveRouterModelFromContext(config, ctx) }), "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		refreshRouterSettingsFromStore();
		ctx.ui.setStatus("pi-router", routerIdleStatus(config.state, ctx));
	});

	pi.on("message_end", async (event, ctx) => {
		refreshRouterSettingsFromStore();
		if (event.message?.role !== "assistant") {
			return;
		}
		if (hasToolCallContent(event.message.content)) {
			return;
		}
		if (!hasPotentialFinalAnswerText(event.message.content)) {
			return;
		}
		const pendingTurn = pendingRoutedTurns.shift();
		if (!pendingTurn) {
			return;
		}
		const detailsForTurn = pendingTurn.details;
		const shouldTranslateFinalAnswer = pendingTurn.shouldTranslateFinalAnswer;

		if (!shouldTranslateFinalAnswer) {
			return;
		}

		const englishAnswer = extractSingleTextContent(event.message.content);
		if (englishAnswer === null) {
			pi.appendEntry("pi-router-details", completeSkippedFinalAnswer(detailsForTurn, "final answer translation skipped: unsupported message content"));
			return;
		}
		if (!englishAnswer.trim()) {
			return;
		}
		const translate = dependencies.translateFinalAnswer
			?? ((answer: string, routerModel: RouterConfig["routerModel"], context: any) => translateFinalAnswerToSpanish(answer, routerModel, fetch as any, { modelRegistry: context?.modelRegistry }));
		const translated = await translate(englishAnswer, config.routerModel, ctx);
		const completedDetails = extendRouterDetailsAfterCompletion(detailsForTurn, {
			englishAnswer: translated.englishAnswer,
			spanishAnswer: translated.spanishAnswer,
			effectiveThinkingLevel: typeof (pi as any).getThinkingLevel === "function" ? (pi as any).getThinkingLevel() : undefined,
			fallbackEvents: translated.degradedReason ? [translated.degradedReason] : undefined,
		});
		pi.appendEntry("pi-router-details", completedDetails);
		if (translated.degradedReason) {
			const warning = `Pi router warning: ${translated.degradedReason}; showing original or partially translated answer.`;
			if (ctx?.ui?.notify) {
				ctx.ui.notify(warning, "warning");
			} else if (typeof (pi as any).notify === "function") {
				(pi as any).notify(warning, "warning");
			}
		}
		return {
			message: {
				...event.message,
				content: replaceTextContent(event.message.content, translated.spanishAnswer),
			} as typeof event.message,
		};
	});

	pi.on("input", async (event, ctx) => {
		refreshRouterSettingsFromStore();
		if (!shouldRouteInput({ text: event.text, source: event.source })) {
			return { action: "continue" };
		}

		const prepare = () => prepareRoutedPrompt({
				prompt: event.text,
				config,
				workModel: selectedWorkModelFromPiContext(ctx),
				routePrompt: dependencies.routePrompt
					?? ((prompt, routerModel, context) => routePromptWithModel(prompt, routerModel, fetch as any, context, { modelRegistry: ctx.modelRegistry })),
			});

		let prepared: Awaited<ReturnType<typeof prepareRoutedPrompt>>;
		if (config.state === "on") {
			const phrases = dependencies.promptPreparationPhrases ?? PROMPT_PREPARATION_PHRASES;
			const pickPhrase = dependencies.pickPromptPreparationPhrase ?? pickPromptPreparationPhrase;
			const startInterval = dependencies.setInterval ?? setInterval;
			const stopInterval = dependencies.clearInterval ?? clearInterval;
			let workingMessage = pickPhrase(phrases);
			ctx.ui.setStatus("pi-router", promptPreparationStatus(workingMessage, ctx));
			const phraseInterval = startInterval(() => {
				workingMessage = pickPhrase(phrases, workingMessage);
				ctx.ui.setStatus("pi-router", promptPreparationStatus(workingMessage, ctx));
			}, 2_000);
			try {
				prepared = await prepare();
			} finally {
				stopInterval(phraseInterval);
				ctx.ui.setStatus("pi-router", routerIdleStatus("on", ctx));
			}
		} else {
			prepared = await prepare();
		}

		if (prepared.action === "continue") {
			return { action: "continue" };
		}
		if (prepared.action === "handled") {
			pi.appendEntry("pi-router-details", prepared.details);
			ctx.ui.notify(prepared.message, "warning");
			ctx.ui.setStatus("pi-router", degradedStatus(ctx));
			return { action: "handled" };
		}

		pi.setThinkingLevel(prepared.result.thinkingLevel);
		pendingRoutedTurns.push({
			details: prepared.details,
			shouldTranslateFinalAnswer: prepared.result.translateFinalAnswer,
		});
		pi.appendEntry("pi-router-details", prepared.details);
		if (prepared.warning) {
			ctx.ui.notify(prepared.warning, "warning");
		}
		ctx.ui.setStatus("pi-router", thinkingStatus(prepared.result.thinkingLevel, Boolean(prepared.warning), ctx));
		return { action: "transform", text: prepared.prompt };
	});
}
