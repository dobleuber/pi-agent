import type { WorkModelInfo } from "./config.ts";
import type { RouterMetadata, ThinkingLevel } from "./router-model.ts";

export type RouterDetailsPhase = "pre-dispatch" | "complete";

export interface RouterDetails {
	originalPrompt: string;
	transformedPrompt: string;
	sourceLanguage: string;
	routerModel: string;
	requestedThinkingLevel: ThinkingLevel;
	workModel: string;
	englishAnswer?: string;
	spanishAnswer?: string;
	effectiveThinkingLevel?: string;
	fallbackEvents?: string[];
}

export interface RouterDetailsEntry {
	phase: RouterDetailsPhase;
	expanded: boolean;
	routingState: "on";
	summary: string;
	details: RouterDetails;
}

export interface CompletedRouterDetails {
	englishAnswer: string;
	spanishAnswer: string;
	effectiveThinkingLevel?: string;
	fallbackEvents?: string[];
}

export function createRouterDetailsEntry(metadata: RouterMetadata, workModel?: WorkModelInfo): RouterDetailsEntry {
	const formattedWorkModel = formatWorkModel(workModel);
	return {
		phase: "pre-dispatch",
		expanded: false,
		routingState: "on",
		summary: `router: ${metadata.sourceLanguage}→en thinking:${metadata.requestedThinkingLevel} workModel:${formattedWorkModel}`,
		details: {
			originalPrompt: metadata.originalPrompt,
			transformedPrompt: metadata.transformedPrompt,
			sourceLanguage: metadata.sourceLanguage,
			routerModel: metadata.routerModel,
			requestedThinkingLevel: metadata.requestedThinkingLevel,
			workModel: formattedWorkModel,
			...(metadata.fallback ? { fallbackEvents: [metadata.fallback] } : {}),
		},
	};
}

export function toggleRouterDetails(entry: RouterDetailsEntry): RouterDetailsEntry {
	return { ...entry, expanded: !entry.expanded };
}

export function extendRouterDetailsAfterCompletion(
	entry: RouterDetailsEntry,
	completion: CompletedRouterDetails,
): RouterDetailsEntry {
	return {
		...entry,
		phase: "complete",
		details: {
			...entry.details,
			englishAnswer: completion.englishAnswer,
			spanishAnswer: completion.spanishAnswer,
			...(completion.effectiveThinkingLevel ? { effectiveThinkingLevel: completion.effectiveThinkingLevel } : {}),
			...(completion.fallbackEvents ? { fallbackEvents: completion.fallbackEvents } : {}),
		},
	};
}

export function parseSinglePromptBypass(text: string): { bypass: boolean; prompt: string } {
	const trimmed = text.trimStart();
	const prefix = "@router:off";
	if (!trimmed.startsWith(prefix)) {
		return { bypass: false, prompt: text };
	}
	return { bypass: true, prompt: trimmed.slice(prefix.length).trimStart() };
}

function formatWorkModel(workModel?: WorkModelInfo): string {
	if (!workModel?.provider && !workModel?.model) return "unknown";
	if (!workModel.provider) return workModel.model ?? "unknown";
	if (!workModel.model) return workModel.provider;
	return `${workModel.provider}/${workModel.model}`;
}
