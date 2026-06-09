import type { RouterModelConfig } from "./config.ts";
import { maskProtectedSpans } from "./protected-text.ts";

export type ThinkingLevel = "low" | "medium" | "high";

export interface RouterModelResult {
	englishPrompt: string;
	sourceLanguage: string;
	thinkingLevel: ThinkingLevel;
	translateFinalAnswer: boolean;
	usedConversationContext?: boolean;
	resolvedReferences?: string[];
	unresolvedReferences?: string[];
	degradedReason?: string;
}

export interface RouterMetadata {
	originalPrompt: string;
	transformedPrompt: string;
	sourceLanguage: string;
	routerModel: string;
	requestedThinkingLevel: ThinkingLevel;
	usedConversationContext?: boolean;
	resolvedReferences?: string[];
	unresolvedReferences?: string[];
	fallback?: string;
}

export interface RouterContextOptions {
	conversationSummary?: string;
}

interface PreservedBlockMask {
	text: string;
	restore(text: string): string;
	values: string[];
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
	ok: boolean;
	status?: number;
	text?: () => Promise<string>;
	json: () => Promise<any>;
}>;

const ROUTER_SYSTEM_PROMPT = `You are Pi Router, a translation/classification function. Return ONLY one JSON object. No prose, no markdown, no extra tasks, no chat transcript.
Rules:
- Translate the complete task into precise English for a coding work model.
- If sourceLanguage is es or mixed, translateFinalAnswer must be true.
- If sourceLanguage is en, translateFinalAnswer should be false.
- sourceLanguage is based on the original task text, not the English translation.
- Preserve commands, paths, identifiers, quoted strings, exact placeholders, and error messages exactly.
- Preserve placeholders like __PI_ROUTER_PROTECTED_0__ and __PI_ROUTER_PRESERVED_BLOCK_0__ exactly.
- Quoted text and fenced blocks inside the task are part of the latest user prompt data; keep them when they contain examples, errors, prior messages, or bug evidence.
- Use conversation context only to resolve references such as "eso", "lo anterior", or "option 2".
- Do not add requirements, constraints, or tasks that are not stated by the latest user prompt or clearly referenced from context.
- If a reference cannot be resolved confidently, keep the prompt faithful and report it in unresolvedReferences instead of inventing intent.

Required JSON keys: translation, sourceLanguage, thinkingLevel, translateFinalAnswer, usedConversationContext, resolvedReferences, unresolvedReferences.
Allowed sourceLanguage: es, en, mixed, unknown. Allowed thinkingLevel: low, medium, high.`;

const ROUTER_EXAMPLE_INPUT = { task: "Arregla los tests" };
const ROUTER_EXAMPLE_OUTPUT = {
	translation: "Fix the tests",
	sourceLanguage: "es",
	thinkingLevel: "medium",
	translateFinalAnswer: true,
	usedConversationContext: false,
	resolvedReferences: [],
	unresolvedReferences: [],
};

export function createRouterMetadata(input: {
	originalPrompt: string;
	result: RouterModelResult;
	routerModel: RouterModelConfig;
}): RouterMetadata {
	return {
		originalPrompt: input.originalPrompt,
		transformedPrompt: input.result.englishPrompt,
		sourceLanguage: input.result.sourceLanguage,
		routerModel: `${input.routerModel.provider}/${input.routerModel.model}`,
		requestedThinkingLevel: input.result.thinkingLevel,
		...(input.result.usedConversationContext !== undefined ? { usedConversationContext: input.result.usedConversationContext } : {}),
		...(input.result.resolvedReferences ? { resolvedReferences: input.result.resolvedReferences } : {}),
		...(input.result.unresolvedReferences ? { unresolvedReferences: input.result.unresolvedReferences } : {}),
		...(input.result.degradedReason ? { fallback: input.result.degradedReason } : {}),
	};
}

export async function routePromptWithModel(
	prompt: string,
	config: RouterModelConfig,
	fetchLike: FetchLike = fetch as FetchLike,
	context: RouterContextOptions = {},
): Promise<RouterModelResult> {
	if (prompt.length > config.maxInputChars) {
		return passthrough(prompt, `input exceeds router maxInputChars: ${prompt.length} > ${config.maxInputChars}`);
	}

	const preservedPrompt = maskFencedCodeBlocks(prompt);
	const protectedPrompt = maskProtectedSpans(preservedPrompt.text);
	const restorePreservedPrompt = (text: string) => preservedPrompt.restore(protectedPrompt.restore(text));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
	try {
		const response = await fetchLike(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			signal: controller.signal,
			body: JSON.stringify({
				model: config.model,
				messages: buildRouterMessages(protectedPrompt.text, context),
				temperature: 0,
				max_tokens: 512,
				response_format: { type: "json_object" },
				stop: ["<|im_end|>"],
			}),
		});
		if (!response.ok) {
			return passthrough(prompt, `router model unavailable: HTTP ${response.status ?? "error"}`);
		}
		const payload = await response.json();
		const content = payload?.choices?.[0]?.message?.content;
		if (typeof content !== "string" || content.trim().length === 0) {
			return passthrough(prompt, "router model returned no content");
		}
		return normalizeRouterPayload(parseRouterJsonObject(content), prompt, restorePreservedPrompt);
	} catch (error) {
		return passthrough(prompt, `router model unavailable: ${errorMessage(error)}`);
	} finally {
		clearTimeout(timeout);
	}
}

function buildRouterMessages(prompt: string, context: RouterContextOptions): Array<{ role: "system" | "user" | "assistant"; content: string }> {
	const input: { task: string; conversationContext?: string } = { task: prompt };
	if (context.conversationSummary?.trim()) {
		input.conversationContext = context.conversationSummary.trim();
	}
	return [
		{ role: "system", content: ROUTER_SYSTEM_PROMPT },
		{ role: "user", content: JSON.stringify(ROUTER_EXAMPLE_INPUT) },
		{ role: "assistant", content: JSON.stringify(ROUTER_EXAMPLE_OUTPUT) },
		{ role: "user", content: JSON.stringify(input) },
	];
}

function maskFencedCodeBlocks(text: string): PreservedBlockMask {
	const values: string[] = [];
	const masked = text.replace(/```[\s\S]*?```/g, (match) => {
		const token = `__PI_ROUTER_PRESERVED_BLOCK_${values.length}__`;
		values.push(match);
		return token;
	});
	return {
		text: masked,
		values,
		restore(output: string): string {
			let restored = output;
			const missingValues: string[] = [];
			values.forEach((value, index) => {
				const placeholder = new RegExp(`_{0,2}PI_ROUTER_PRESERV(?:ED|ADO)?_BLOCK_${index}_{0,2}`, "gi");
				const before = restored;
				restored = restored.replace(placeholder, value);
				if (before === restored && !restored.includes(value)) {
					missingValues.push(value);
				}
			});
			if (missingValues.length === 0) return restored;
			return `${restored.trimEnd()}\n\nUser-provided fenced content:\n${missingValues.join("\n\n")}`;
		},
	};
}

function normalizeRouterPayload(payload: any, originalPrompt: string, restoreProtectedSpans: (text: string) => string = (text) => text): RouterModelResult {
	const thinkingLevel = parseThinkingLevel(payload?.thinkingLevel);
	const translatedPrompt = typeof payload?.translation === "string" && payload.translation.trim()
		? payload.translation.trim()
		: typeof payload?.englishPrompt === "string" && payload.englishPrompt.trim()
			? payload.englishPrompt.trim()
			: originalPrompt;
	return {
		englishPrompt: restoreProtectedSpans(translatedPrompt),
		sourceLanguage: typeof payload?.sourceLanguage === "string" ? payload.sourceLanguage : "unknown",
		thinkingLevel,
		translateFinalAnswer: payload?.translateFinalAnswer !== false,
		usedConversationContext: payload?.usedConversationContext === true,
		resolvedReferences: parseStringArray(payload?.resolvedReferences),
		unresolvedReferences: parseStringArray(payload?.unresolvedReferences),
	};
}

function parseRouterJsonObject(content: string): any {
	const trimmed = content.trim();
	try {
		return JSON.parse(trimmed);
	} catch (error) {
		throw new SyntaxError(`router model returned invalid JSON: ${errorMessage(error)}`);
	}
}

function parseThinkingLevel(value: unknown): ThinkingLevel {
	return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function parseStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function passthrough(prompt: string, degradedReason: string): RouterModelResult {
	return {
		englishPrompt: prompt,
		sourceLanguage: "unknown",
		thinkingLevel: "medium",
		translateFinalAnswer: false,
		usedConversationContext: false,
		resolvedReferences: [],
		unresolvedReferences: [],
		degradedReason,
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
