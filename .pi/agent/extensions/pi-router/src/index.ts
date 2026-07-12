import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_ROUTER_CONFIG, routerStatusSummary, type RouterConfig, type WorkModelInfo } from "./config.ts";
import { extendRouterDetailsAfterCompletion, type RouterDetailsEntry } from "./details.ts";
import { translateFinalAnswerToSpanish, type FinalAnswerTranslationResult } from "./final-answer.ts";
import { shouldRouteInput } from "./input.ts";
import { prepareRoutedPrompt, type PrepareRoutedPromptInput } from "./pipeline.ts";
import { resolvePiRouterModel } from "./pi-ai-client.ts";
import { routePromptWithModel } from "./router-model.ts";
import { createFileRouterStateStore, type RouterStateStore } from "./state.ts";
import { parseThinkingOverride, resolveWorkProfile } from "./thinking.ts";
import { selectedWorkModelFromPiContext } from "./work-model.ts";

export interface PiRouterDependencies {
	config?: RouterConfig;
	routePrompt?: PrepareRoutedPromptInput["routePrompt"];
	translateFinalAnswer?: (answer: string, config: RouterConfig["routerModel"], ctx?: any) => Promise<FinalAnswerTranslationResult>;
	stateStore?: RouterStateStore;
	promptPreparationPhrases?: readonly string[];
	pickPromptPreparationPhrase?: (phrases: readonly string[], previous?: string) => string;
	setInterval?: (callback: () => void, delay: number) => any;
	clearInterval?: (interval: any) => void;
	/** Reads the mutable Pi context after model changes; injectable for API-compatible testing. */
	readCurrentModel?: (ctx: any) => WorkModelInfo;
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
		? `${statusColor(ctx, "accent", "◆")} ${statusColor(ctx, "muted", "Router on")}`
		: statusColor(ctx, "muted", "◇ Router off");
}

function promptPreparationStatus(message: string, ctx: any): string {
	return `${statusColor(ctx, "accent", "◆")} ${statusColor(ctx, "muted", message)}`;
}

function thinkingStatus(level: string, degraded: boolean, ctx: any): string {
	const levelText = statusColor(ctx, "dim", `· ${level}`);
	const degradedText = degraded ? ` ${statusColor(ctx, "warning", "· degraded")}` : "";
	return `${statusColor(ctx, "accent", "◆")} ${statusColor(ctx, "muted", "Thinking")} ${levelText}${degradedText}`;
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

function hasToolCallContent(content: unknown): boolean {
	return Array.isArray(content) && content.some((part) => part && typeof part === "object" && (part as any).type === "toolCall");
}

function replaceTextContent(content: unknown, text: string): unknown {
	if (typeof content === "string") return text;
	if (Array.isArray(content)) {
		let replaced = false;
		const replacedContent = content.map((part) => {
			if (!replaced && part && typeof part === "object" && (part as any).type === "text") {
				replaced = true;
				return { ...part, text };
			}
			return part;
		});
		return replaced ? replacedContent : [...replacedContent, { type: "text", text }];
	}
	return [{ type: "text", text }];
}

function restoreEnglishAssistantContext(messages: any[], branch: any[]): any[] {
	const answersByTimestamp = new Map<number, string[]>();
	const answersBySpanish = new Map<string, string[]>();
	for (const entry of branch) {
		if (entry?.type !== "custom" || entry.customType !== "pi-router-details" || entry.data?.phase !== "complete") continue;
		const english = entry.data.details?.englishAnswer;
		const spanish = entry.data.details?.spanishAnswer;
		const assistantTimestamp = entry.data.details?.assistantTimestamp;
		if (typeof english !== "string" || typeof spanish !== "string" || english === spanish) continue;
		if (typeof assistantTimestamp === "number") {
			answersByTimestamp.set(assistantTimestamp, [...(answersByTimestamp.get(assistantTimestamp) ?? []), english]);
		} else {
			answersBySpanish.set(spanish, [...(answersBySpanish.get(spanish) ?? []), english]);
		}
	}
	const assistantCounts = new Map<string, number>();
	const assistantTimestampCounts = new Map<number, number>();
	for (const message of messages) {
		if (message?.role !== "assistant") continue;
		const text = extractSingleTextContent(message.content);
		if (text !== null) assistantCounts.set(text, (assistantCounts.get(text) ?? 0) + 1);
		if (typeof message.timestamp === "number") {
			assistantTimestampCounts.set(message.timestamp, (assistantTimestampCounts.get(message.timestamp) ?? 0) + 1);
		}
	}

	return messages.map((message) => {
		if (message?.role !== "assistant") return message;
		if (typeof message.timestamp === "number" && assistantTimestampCounts.get(message.timestamp) === 1) {
			const timestampAnswers = answersByTimestamp.get(message.timestamp);
			if (timestampAnswers?.length === 1) {
				return { ...message, content: replaceTextContent(message.content, timestampAnswers[0]) };
			}
		}
		const spanish = extractSingleTextContent(message.content);
		if (spanish === null || assistantCounts.get(spanish) !== 1) return message;
		const englishAnswers = answersBySpanish.get(spanish);
		if (englishAnswers?.length !== 1) return message;
		return { ...message, content: replaceTextContent(message.content, englishAnswers[0]) };
	});
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

export default function piRouterExtension(pi: ExtensionAPI) {
	installPiRouter(pi, {});
}

export function installPiRouter(pi: ExtensionAPI, dependencies: PiRouterDependencies = {}) {
	const stateStore = dependencies.stateStore ?? createFileRouterStateStore();
	const initialConfig = dependencies.config ?? DEFAULT_ROUTER_CONFIG;
	const pendingRoutedTurns: PendingRoutedTurn[] = [];
	let nextTurnId = 1;
	let inputTail: Promise<void> | null = null;
	let messageEndTail: Promise<void> | null = null;

	function serialize<T>(tail: "input" | "messageEnd", work: () => Promise<T>): Promise<T> {
		const previous = tail === "input" ? inputTail : messageEndTail;
		const result = previous ? previous.then(work) : work();
		const settled = result.then(() => undefined, () => undefined);
		if (tail === "input") {
			inputTail = settled;
			void settled.then(() => { if (inputTail === settled) inputTail = null; });
		} else {
			messageEndTail = settled;
			void settled.then(() => { if (messageEndTail === settled) messageEndTail = null; });
		}
		return result;
	}

	function loadPersistedConfig(): Partial<Pick<RouterConfig, "state">> {
		const persistedState = stateStore.loadState();
		return typeof persistedState === "string" ? { state: persistedState } : (persistedState ?? {});
	}

	function configFromPersistedState(persistedConfig: Partial<Pick<RouterConfig, "state">>): RouterConfig {
		return { ...initialConfig, ...persistedConfig };
	}

	function refreshRouterSettingsFromStore() {
		config = configFromPersistedState(loadPersistedConfig());
	}

	let config: RouterConfig = configFromPersistedState(loadPersistedConfig());

	function saveRouterSettings() {
		stateStore.saveState({ state: config.state });
	}

	function setRouterState(state: RouterConfig["state"], ctx: any) {
		refreshRouterSettingsFromStore();
		config = { ...config, state };
		saveRouterSettings();
		ctx.ui.setStatus("pi-router", routerIdleStatus(config.state, ctx));
	}

	pi.registerCommand("router", {
		description: "Show or change Pi router status: /router, /router on, /router off",
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
			if (command === "local" || command.startsWith("local ")) {
				ctx.ui.notify("Local router mode has been removed; Pi Router always uses the remote GPT mini model.", "warning");
				return;
			}
			ctx.ui.notify(routerStatusSummary({ config, effectiveRouterModel: effectiveRouterModelFromContext(config, ctx) }), "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		refreshRouterSettingsFromStore();
		ctx.ui.setStatus("pi-router", routerIdleStatus(config.state, ctx));
	});

	pi.on("context", async (event, ctx) => {
		const branch = ctx.sessionManager?.getBranch?.() ?? [];
		return { messages: restoreEnglishAssistantContext(event.messages, branch) };
	});

	pi.on("message_end", async (event, ctx) => serialize("messageEnd", async () => {
		refreshRouterSettingsFromStore();
		if (event.message?.role !== "assistant") {
			return;
		}
		if (hasToolCallContent(event.message.content)) return;
		const phase = (event.message as any).phase;
		if (phase && phase !== "final_answer") return;
		const supportedText = extractSingleTextContent(event.message.content);
		if (!phase && (supportedText === null || !supportedText.trim())) return;
		const pendingTurn = pendingRoutedTurns.shift();
		if (!pendingTurn) {
			return;
		}
		const detailsForTurn = pendingTurn.details;
		const shouldTranslateFinalAnswer = pendingTurn.shouldTranslateFinalAnswer;
		const englishAnswer = supportedText;
		if (englishAnswer === null) {
			const diagnostic = "Pi router: final answer had unsupported content.";
			pi.appendEntry("pi-router-details", extendRouterDetailsAfterCompletion(detailsForTurn, { englishAnswer: diagnostic, spanishAnswer: diagnostic, assistantTimestamp: event.message.timestamp, fallbackEvents: ["final answer translation skipped: unsupported message content"] }));
			return { message: { ...event.message, content: replaceTextContent(event.message.content, diagnostic) } as typeof event.message };
		}
		if (!englishAnswer.trim()) {
			const diagnostic = "Pi router: final answer was empty.";
			pi.appendEntry("pi-router-details", extendRouterDetailsAfterCompletion(detailsForTurn, { englishAnswer: diagnostic, spanishAnswer: diagnostic, assistantTimestamp: event.message.timestamp, fallbackEvents: ["final answer translation skipped: empty answer"] }));
			return { message: { ...event.message, content: replaceTextContent(event.message.content, diagnostic) } as typeof event.message };
		}
		if (!shouldTranslateFinalAnswer) {
			pi.appendEntry("pi-router-details", extendRouterDetailsAfterCompletion(detailsForTurn, {
				englishAnswer,
				spanishAnswer: englishAnswer,
				assistantTimestamp: event.message.timestamp,
				effectiveThinkingLevel: typeof (pi as any).getThinkingLevel === "function" ? (pi as any).getThinkingLevel() : undefined,
			}));
			return;
		}
		const translate = dependencies.translateFinalAnswer
			?? ((answer: string, routerModel: RouterConfig["routerModel"], context: any) => translateFinalAnswerToSpanish(answer, routerModel, { modelRegistry: context?.modelRegistry }));
		const translated = await translate(englishAnswer, config.routerModel, ctx);
		const completedDetails = extendRouterDetailsAfterCompletion(detailsForTurn, {
			englishAnswer: translated.englishAnswer,
			spanishAnswer: translated.spanishAnswer,
			assistantTimestamp: event.message.timestamp,
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
	}));

	pi.on("input", async (event, ctx) => serialize("input", async () => {
		refreshRouterSettingsFromStore();
		if (!shouldRouteInput({ text: event.text, source: event.source })) {
			return { action: "continue" };
		}

		const override = parseThinkingOverride(event.text);
		if (override.error) {
			ctx.ui.notify(override.error, "warning");
			return { action: "handled" };
		}
		const prepare = () => prepareRoutedPrompt({
				prompt: override.prompt,
				config,
				workModel: selectedWorkModelFromPiContext(ctx),
				routePrompt: dependencies.routePrompt
					?? ((prompt, routerModel, context) => routePromptWithModel(prompt, routerModel, context, { modelRegistry: ctx.modelRegistry })),
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

		const readCurrentModel = dependencies.readCurrentModel ?? selectedWorkModelFromPiContext;
		const current = readCurrentModel(ctx);
		const currentModel = current.provider && current.model ? `${current.provider}/${current.model}` : "unknown";
		const activeTools = typeof (pi as any).getActiveTools === "function" ? (pi as any).getActiveTools() : (ctx as any)?.tools ?? [];
		const subagentToolsAvailable = Array.isArray(activeTools) && activeTools.some((tool: any) => /subagent|delegate|parallel/i.test(typeof tool === "string" ? tool : tool?.name ?? ""));
		const profile = resolveWorkProfile({ prompt: event.text, context: prepared.context?.conversationSummary, currentModel, advisory: prepared.result, subagentToolsAvailable });
		const fallbackEvents: string[] = [...(prepared.details.details.fallbackEvents ?? [])];
		let effectiveModel = currentModel;
		if (profile.modelRouting === "managed-family" && profile.selectedModel !== currentModel) {
			const [provider, model] = profile.selectedModel.split("/", 2);
			const resolved = ctx?.modelRegistry?.find?.(provider, model);
			if (!resolved) {
				const warning = `Pi router model fallback: ${profile.selectedModel} unavailable.`;
				fallbackEvents.push(warning); ctx.ui.notify(warning, "warning");
			} else if (typeof (pi as any).setModel !== "function") {
				const warning = "Pi router model fallback: pi.setModel API unavailable; preserving current model.";
				fallbackEvents.push(warning); ctx.ui.notify(warning, "warning");
			} else try {
				await (pi as any).setModel(resolved);
				const effective = readCurrentModel(ctx);
				effectiveModel = effective.provider && effective.model ? `${effective.provider}/${effective.model}` : "unknown";
				if (effectiveModel !== profile.selectedModel) {
					const warning = `Pi router model fallback: requested ${profile.selectedModel}, effective ${effectiveModel}.`;
					fallbackEvents.push(warning); ctx.ui.notify(warning, "warning");
				}
			} catch (error) {
				const warning = `Pi router model fallback: ${String(error)}`;
				fallbackEvents.push(warning); ctx.ui.notify(warning, "warning");
			}
		}
		if (typeof (pi as any).setThinkingLevel === "function") {
			(pi as any).setThinkingLevel(profile.requestedThinkingLevel);
		} else {
			const warning = "Pi router thinking fallback: pi.setThinkingLevel API unavailable; preserving current thinking level.";
			fallbackEvents.push(warning); ctx.ui.notify(warning, "warning");
		}
		const effectiveThinkingLevel = typeof (pi as any).getThinkingLevel === "function" ? (pi as any).getThinkingLevel() : profile.requestedThinkingLevel;
		if (effectiveThinkingLevel !== profile.requestedThinkingLevel) {
			const warning = `Pi router adjusted thinking ${profile.requestedThinkingLevel} to ${effectiveThinkingLevel}.`;
			fallbackEvents.push(warning); ctx.ui.notify(warning, "warning");
		}
		if (profile.executionFallbackReason) { fallbackEvents.push(profile.executionFallbackReason); ctx.ui.notify(profile.executionFallbackReason, "warning"); }
		const detailsForTurn: RouterDetailsEntry = {
			...prepared.details,
			details: { ...prepared.details.details, turnId: `router-turn-${nextTurnId++}`,
				requestedThinkingLevel: profile.requestedThinkingLevel, effectiveThinkingLevel,
				advisoryThinkingLevel: profile.advisoryThinkingLevel, thinkingReason: profile.reason,
				policySelectedModel: profile.selectedModel, effectiveModel, modelRouting: profile.modelRouting,
				executionMode: profile.executionMode, requestedExecutionMode: profile.requestedExecutionMode,
				normalizedSignals: profile.signals, overrideSource: profile.overrideSource,
				...(profile.overrideConflict ? { overrideConflict: true } : {}),
				thinkingWasClamped: effectiveThinkingLevel !== profile.requestedThinkingLevel,
				...(profile.thinkingNormalization ? { thinkingNormalization: profile.thinkingNormalization } : {}),
				...(fallbackEvents.length ? { fallbackEvents } : {}) },
		};
		pendingRoutedTurns.push({
			details: detailsForTurn,
			shouldTranslateFinalAnswer: prepared.result.sourceLanguage === "es" || prepared.result.sourceLanguage === "mixed" ? true : prepared.result.translateFinalAnswer,
		});
		pi.appendEntry("pi-router-details", detailsForTurn);
		if (prepared.warning) {
			ctx.ui.notify(prepared.warning, "warning");
		}
		ctx.ui.setStatus("pi-router", thinkingStatus(effectiveThinkingLevel, Boolean(prepared.warning || fallbackEvents.length), ctx));
		const dispatchedPrompt = profile.executionMode === "parallel-agentic"
			? `${prepared.prompt}\n\nExecution guidance: delegate only independent work units through active Pi subagent tools; keep dependent work local and bounded.`
			: prepared.prompt;
		return { action: "transform", text: dispatchedPrompt };
	}));
}
