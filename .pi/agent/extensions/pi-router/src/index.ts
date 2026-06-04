import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_ROUTER_CONFIG, routerStatusSummary, type RouterConfig } from "./config.ts";
import { extendRouterDetailsAfterCompletion, type RouterDetailsEntry } from "./details.ts";
import { translateFinalAnswerToSpanish, type FinalAnswerTranslationResult } from "./final-answer.ts";
import { shouldRouteInput } from "./input.ts";
import { prepareRoutedPrompt, type PrepareRoutedPromptInput } from "./pipeline.ts";
import { createFileRouterStateStore, type RouterStateStore } from "./state.ts";
import { selectedWorkModelFromPiContext } from "./work-model.ts";

export interface PiRouterDependencies {
	config?: RouterConfig;
	routePrompt?: PrepareRoutedPromptInput["routePrompt"];
	translateFinalAnswer?: (answer: string, config: RouterConfig["routerModel"]) => Promise<FinalAnswerTranslationResult>;
	stateStore?: RouterStateStore;
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

export default function piRouterExtension(pi: ExtensionAPI) {
	installPiRouter(pi, {});
}

export function installPiRouter(pi: ExtensionAPI, dependencies: PiRouterDependencies = {}) {
	const stateStore = dependencies.stateStore ?? createFileRouterStateStore();
	const persistedState = stateStore.loadState();
	let config: RouterConfig = { ...(dependencies.config ?? DEFAULT_ROUTER_CONFIG), ...(persistedState ? { state: persistedState } : {}) };
	const pendingRoutedTurns: PendingRoutedTurn[] = [];

	function setRouterState(state: RouterConfig["state"], ctx: any) {
		config = { ...config, state };
		stateStore.saveState(state);
		ctx.ui.setStatus("pi-router", `router:${config.state}`);
	}

	pi.registerCommand("router", {
		description: "Show or change Pi router status: /router, /router on, /router off",
		handler: async (args, ctx) => {
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
			ctx.ui.notify(routerStatusSummary({ config }), "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setStatus("pi-router", `router:${config.state}`);
	});

	pi.on("message_end", async (event, ctx) => {
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
			?? ((answer: string, routerModel: RouterConfig["routerModel"]) => translateFinalAnswerToSpanish(answer, routerModel));
		const translated = await translate(englishAnswer, config.routerModel);
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
			},
		};
	});

	pi.on("input", async (event, ctx) => {
		if (!shouldRouteInput({ text: event.text, source: event.source })) {
			return { action: "continue" };
		}

		if (config.state === "on") {
			ctx.ui.setStatus("pi-router", "router:on routing...");
		}

		const prepared = await prepareRoutedPrompt({
			prompt: event.text,
			config,
			workModel: selectedWorkModelFromPiContext(ctx),
			routePrompt: dependencies.routePrompt,
		});

		if (prepared.action === "continue") {
			return { action: "continue" };
		}
		if (prepared.action === "handled") {
			pi.appendEntry("pi-router-details", prepared.details);
			ctx.ui.notify(prepared.message, "warning");
			ctx.ui.setStatus("pi-router", `router:${config.state} degraded`);
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
		ctx.ui.setStatus("pi-router", `router:${config.state} thinking:${prepared.result.thinkingLevel}${prepared.warning ? " degraded" : ""}`);
		return { action: "transform", text: prepared.prompt };
	});
}
