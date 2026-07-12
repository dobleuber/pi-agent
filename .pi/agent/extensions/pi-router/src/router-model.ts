import type { RouterModelConfig } from "./config.ts";
import { assistantText, completeWithPiRouterModel, userMessage, type PiAiRuntime } from "./pi-ai-client.ts";
import { validatePlaceholderIntegrity } from "./placeholder-integrity.ts";
import { maskProtectedSpans } from "./protected-text.ts";

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type TaskComplexity = "trivial" | "routine" | "moderate" | "complex" | "difficult" | "unknown";
export type TaskRisk = "low" | "medium" | "high" | "unknown";
export type WorkModelTier = "luna" | "terra" | "sol";

export interface RouterModelResult {
	englishPrompt: string;
	sourceLanguage: string;
	thinkingLevel: ThinkingLevel;
	thinkingReason?: string;
	taskComplexity?: TaskComplexity;
	taskRisk?: TaskRisk;
	expectedWorkflow?: string;
	suggestedWorkModelTier?: WorkModelTier;
	parallelizable?: boolean;
	parallelizationReason?: string;
	translateFinalAnswer: boolean;
	translationNormalization?: string;
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
	translationDecision?: string;
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

const ROUTER_SYSTEM_PROMPT = `You are Pi Router, a translation/classification function. Return ONLY one JSON object. No prose, no markdown, no extra tasks, no chat transcript.
Rules:
- Translate the complete task into precise English for a coding work model.
- If sourceLanguage is es or mixed, translateFinalAnswer must be true.
- If sourceLanguage is en, translateFinalAnswer should be false.
- sourceLanguage is based on the original task text, not the English translation.
- Preserve commands, paths, identifiers, quoted strings, exact placeholders, and error messages exactly.
- Preserve markdown formatting, blank lines, headings, blockquotes, bullet/numbered list markers, and line breaks.
- Preserve placeholders like §P0§ and __PI_ROUTER_PRESERVED_BLOCK_0__ exactly.
- Quoted text and fenced blocks inside the task are part of the latest user prompt data; keep them when they contain examples, errors, prior messages, or bug evidence.
- Use conversation context only to resolve references such as "eso", "lo anterior", or "option 2".
- Do not add requirements, constraints, or tasks that are not stated by the latest user prompt or clearly referenced from context.
- If a reference cannot be resolved confidently, keep the prompt faithful and report it in unresolvedReferences instead of inventing intent.

Required JSON keys: translation, sourceLanguage, thinkingLevel, thinkingReason, taskComplexity, taskRisk, expectedWorkflow, suggestedWorkModelTier, parallelizable, parallelizationReason, translateFinalAnswer, usedConversationContext, resolvedReferences, unresolvedReferences.
Allowed sourceLanguage: es, en, mixed, unknown. Allowed thinkingLevel: off, minimal, low, medium, high, xhigh, max. Suggested values are advisory; never request Ultra.`;

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
		...(input.result.translationNormalization ? { translationDecision: input.result.translationNormalization } : {}),
		...(input.result.degradedReason ? { fallback: input.result.degradedReason } : {}),
	};
}

export async function routePromptWithModel(
	prompt: string,
	config: RouterModelConfig,
	context: RouterContextOptions = {},
	runtime: PiAiRuntime = {},
): Promise<RouterModelResult> {
	if (prompt.length > config.maxInputChars) {
		return passthrough(prompt, `input exceeds router maxInputChars: ${prompt.length} > ${config.maxInputChars}`);
	}

	const preservedPrompt = maskFencedCodeBlocks(prompt);
	const protectedPrompt = maskProtectedSpans(preservedPrompt.text);
	const restorePreservedPrompt = (text: string) => preservedPrompt.restore(protectedPrompt.restore(text));
	try {
		const response = await completeWithPiRouterModel(
			config,
			buildRouterPiAiContext(protectedPrompt.text, context),
			runtime,
		);
		const content = assistantText(response);
		if (content.trim().length === 0) {
			return passthrough(prompt, "router model returned no content");
		}
		return normalizeRouterPayload(parseRouterJsonObject(content), prompt, restorePreservedPrompt, protectedPrompt.text);
	} catch (error) {
		return passthrough(prompt, `router model unavailable: ${errorMessage(error)}`);
	}
}

function buildRouterPiAiContext(prompt: string, context: RouterContextOptions) {
	const input = buildRouterInput(prompt, context);
	return {
		systemPrompt: ROUTER_SYSTEM_PROMPT,
		messages: [userMessage(JSON.stringify(input))],
	};
}

function buildRouterInput(prompt: string, context: RouterContextOptions): { task: string; conversationContext?: string } {
	const input: { task: string; conversationContext?: string } = { task: prompt };
	if (context.conversationSummary?.trim()) {
		input.conversationContext = context.conversationSummary.trim();
	}
	return input;
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

function normalizeRouterPayload(
	payload: any,
	originalPrompt: string,
	restoreProtectedSpans: (text: string) => string = (text) => text,
	maskedPrompt: string = originalPrompt,
): RouterModelResult {
	const thinkingLevel = parseThinkingLevel(payload?.thinkingLevel);
	const sourceLanguage = payload?.sourceLanguage === "es" || payload?.sourceLanguage === "en" || payload?.sourceLanguage === "mixed" ? payload.sourceLanguage : "unknown";
	const hasTranslationFlag = typeof payload?.translateFinalAnswer === "boolean";
	const modelTranslateFinalAnswer = hasTranslationFlag ? payload.translateFinalAnswer : true;
	const translateFinalAnswer = sourceLanguage === "es" || sourceLanguage === "mixed" ? true : modelTranslateFinalAnswer;
	const translationNormalization = sourceLanguage === "unknown"
		? hasTranslationFlag
			? `unknown source language; router-model flag ${modelTranslateFinalAnswer} used`
			: "unknown source language; conservative default true used"
		: translateFinalAnswer !== modelTranslateFinalAnswer ? "source-language invariant forced final translation" : undefined;
	const usedConversationContext = payload?.usedConversationContext === true;
	const resolvedReferences = parseStringArray(payload?.resolvedReferences);
	const unresolvedReferences = parseStringArray(payload?.unresolvedReferences);
	const translatedPrompt = typeof payload?.translation === "string" && payload.translation.trim()
		? payload.translation.trim()
		: typeof payload?.englishPrompt === "string" && payload.englishPrompt.trim()
			? payload.englishPrompt.trim()
			: originalPrompt;
	const placeholderMismatch = validatePlaceholderIntegrity(maskedPrompt, translatedPrompt);
	if (placeholderMismatch) {
		return passthrough(originalPrompt, `router model ${placeholderMismatch}`);
	}
	const restoredPrompt = restoreProtectedSpans(translatedPrompt);
	const lostLiteral = requiredPromptLiterals(originalPrompt).find((literal) => !restoredPrompt.includes(literal));
	if (lostLiteral) {
		return passthrough(originalPrompt, `router model lost required literal: ${lostLiteral}`);
	}
	if (/^fix the tests[.!]?$/i.test(restoredPrompt) && !/\b(?:arregla|corrige|fix)\b[\s\S]*\btests?\b/i.test(originalPrompt)) {
		return passthrough(originalPrompt, "router model leaked legacy example output");
	}
	const formattingLoss = promptFormattingLoss(originalPrompt, restoredPrompt);
	if (formattingLoss) {
		return {
			englishPrompt: originalPrompt,
			sourceLanguage,
			thinkingLevel,
			translateFinalAnswer,
			...(translationNormalization ? { translationNormalization } : {}),
			...parseAdvisoryFields(payload),
			usedConversationContext,
			resolvedReferences,
			unresolvedReferences,
			degradedReason: `router model lost prompt formatting: ${formattingLoss}`,
		};
	}
	return {
		englishPrompt: restoredPrompt,
		sourceLanguage,
		thinkingLevel,
		translateFinalAnswer,
		...(translationNormalization ? { translationNormalization } : {}),
		...parseAdvisoryFields(payload),
		usedConversationContext,
		resolvedReferences,
		unresolvedReferences,
	};
}

function requiredPromptLiterals(text: string): string[] {
	return [...text.matchAll(/`[^`\n]+`|"[^"\n]+"|'[^'\n]+'/g)].map((match) => match[0]);
}

function promptFormattingLoss(originalPrompt: string, translatedPrompt: string): string | null {
	if (/```/.test(originalPrompt)) return null;
	const originalLines = nonEmptyLineCount(originalPrompt);
	const translatedLines = nonEmptyLineCount(translatedPrompt);
	if (originalLines > 1 && translatedLines < originalLines) {
		return `line layout collapsed from ${originalLines} to ${translatedLines} non-empty lines`;
	}
	return null;
}

function nonEmptyLineCount(text: string): number {
	return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
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
	return ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(String(value)) ? value as ThinkingLevel : "medium";
}

function parseAdvisoryFields(payload: any): Partial<RouterModelResult> {
	return {
		thinkingReason: typeof payload?.thinkingReason === "string" ? payload.thinkingReason : "router advisory",
		taskComplexity: parseEnum<TaskComplexity>(payload?.taskComplexity, ["trivial", "routine", "moderate", "complex", "difficult"], "unknown"),
		taskRisk: parseEnum<TaskRisk>(payload?.taskRisk, ["low", "medium", "high"], "unknown"),
		expectedWorkflow: typeof payload?.expectedWorkflow === "string" ? payload.expectedWorkflow : "unknown",
		suggestedWorkModelTier: parseEnum<WorkModelTier>(payload?.suggestedWorkModelTier, ["luna", "terra", "sol"], "terra"),
		parallelizable: payload?.parallelizable === true,
		parallelizationReason: typeof payload?.parallelizationReason === "string" ? payload.parallelizationReason : "not provided",
	};
}

function parseEnum<T extends string>(value: unknown, values: readonly T[], fallback: T): T { return values.includes(value as T) ? value as T : fallback; }

function parseStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function passthrough(prompt: string, degradedReason: string): RouterModelResult {
	return {
		englishPrompt: prompt,
		sourceLanguage: "unknown",
		thinkingLevel: "medium",
		translateFinalAnswer: true,
		translationNormalization: "unknown source language; conservative default true used",
		usedConversationContext: false,
		resolvedReferences: [],
		unresolvedReferences: [],
		degradedReason,
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
