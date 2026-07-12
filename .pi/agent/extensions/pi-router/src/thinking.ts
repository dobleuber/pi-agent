import type { ThinkingLevel, RouterModelResult } from "./router-model.ts";

export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export const THINKING_RANK: Record<ThinkingLevel, number> = Object.fromEntries(THINKING_LEVELS.map((level, rank) => [level, rank])) as any;
export const MANAGED_PROFILE_EVIDENCE = {
	luna: { model: "openai-codex/gpt-5.6-luna", level: "max", score: 74.6, cost: 537 },
	terra: { model: "openai-codex/gpt-5.6-terra", level: "max", score: 77.4, cost: 942 },
	solXHigh: { model: "openai-codex/gpt-5.6-sol", level: "xhigh", score: 78.7 },
	solMax: { model: "openai-codex/gpt-5.6-sol", level: "max", score: 80.0 },
} as const;

export type ExecutionMode = "standard" | "parallel-agentic" | "native-ultra";
export interface ThinkingOverride { level?: ThinkingLevel; source?: "syntax" | "natural-language"; prompt: string; conflict?: boolean; error?: string }
export interface WorkProfileDecision {
	selectedModel: string; requestedThinkingLevel: ThinkingLevel; executionMode: ExecutionMode;
	requestedExecutionMode: ExecutionMode; modelRouting: "managed-family" | "preserved-external";
	reason: string; signals: string[]; overrideSource?: string; overrideConflict?: boolean; advisoryThinkingLevel: ThinkingLevel;
	thinkingNormalization?: string; executionFallbackReason?: string;
}
export interface ResolveWorkProfileInput {
	prompt: string; context?: string; currentModel: string; advisory?: Partial<RouterModelResult>;
	subagentToolsAvailable?: boolean; nativeUltraAvailable?: boolean;
}

const MANAGED = /^openai-codex\/gpt-5\.6-(?:luna|terra|sol)$/;
const HIGH = /\b(?:difficult|challenging|debug|architecture|arquitectura|multi[- ]file|multiples? modulos|migration|migraci[oó]n|performance|destructive|complex planning)\b/i;
const XHIGH = /\b(?:code review|security|seguridad|exhaustive|exhaustivo|deep (?:review|research)|repository review|architecture and security|long[- ]running|high[- ]value)\b/i;
const ROUTINE = /\b(?:readme|document|update|actualiza|clear|routine|mechanical|search|transform|coding)\b/i;
const SIMPLE = /^(?:say hello|hello|hola|dime la hora|what time|status)[.!?]?$/i;

export function parseThinkingOverride(prompt: string): ThinkingOverride {
	const syntax = prompt.match(/^\s*@thinking:([^\s]+)\s*/i);
	const unquoted = prompt.replace(/(["'`]).*?\1/g, "");
	const natural = naturalOverride(unquoted);
	if (syntax) {
		const raw = syntax[1].toLowerCase();
		if (!THINKING_LEVELS.includes(raw as ThinkingLevel)) return { prompt, error: `Invalid @thinking level. Use: ${THINKING_LEVELS.join(", ")}.` };
		const level = raw as ThinkingLevel;
		return { level, source: "syntax", prompt: prompt.slice(syntax[0].length), ...(natural && natural !== level ? { conflict: true } : {}) };
	}
	return natural ? { level: natural, source: "natural-language", prompt } : { prompt };
}

function naturalOverride(prompt: string): ThinkingLevel | undefined {
	if (/\b(?:use maximum (?:reasoning|effort|quality)|use all (?:your )?capabilities|usa (?:el )?(?:razonamiento|esfuerzo) m[aá]ximo|usa todas tus capacidades)\b/i.test(prompt)) return "max";
	const named = prompt.match(/\b(?:use|usa)(?: (?:thinking|reasoning|effort|razonamiento|esfuerzo))? (off|minimal|low|medium|high|xhigh|max|bajo|medio|alto|m[ií]nimo)\b/i)?.[1]?.toLowerCase();
	return ({ bajo: "low", medio: "medium", alto: "high", "mínimo": "minimal", minimo: "minimal" } as any)[named ?? ""] ?? (THINKING_LEVELS.includes(named as any) ? named as ThinkingLevel : undefined);
}

export function resolveWorkProfile(input: ResolveWorkProfileInput): WorkProfileDecision {
	const override = parseThinkingOverride(input.prompt);
	const advisoryRaw = isLevel(input.advisory?.thinkingLevel) ? input.advisory!.thinkingLevel! : "medium";
	const advisory = advisoryRaw === "max" ? "xhigh" : advisoryRaw;
	const text = `${input.prompt}\n${input.context ?? ""}`;
	const signals: string[] = [];
	let floor: ThinkingLevel = "medium";
	if (XHIGH.test(text)) { floor = "xhigh"; signals.push("exhaustive/high-value workflow"); }
	else if (HIGH.test(text) || input.advisory?.taskRisk === "high" || input.advisory?.taskComplexity === "complex") { floor = "high"; signals.push("complexity/risk floor"); }
	else if (SIMPLE.test(input.prompt.trim()) && input.advisory?.thinkingLevel === "low" && input.advisory?.taskComplexity === "trivial") { floor = "low"; signals.push("aligned trivial low-risk signals"); }
	else signals.push(ROUTINE.test(text) ? "routine clear workflow" : "conservative default");
	let level = override.level ?? higher(floor, advisory);
	const managed = MANAGED.test(input.currentModel);
	let selectedModel = input.currentModel;
	if (managed) {
		if (override.level) {
			level = override.level;
			if (override.level === "max" || override.level === "xhigh") selectedModel = MANAGED_PROFILE_EVIDENCE.solMax.model;
			else selectedModel = MANAGED_PROFILE_EVIDENCE.luna.model;
		} else if (floor === "xhigh") { selectedModel = MANAGED_PROFILE_EVIDENCE.solXHigh.model; level = "xhigh"; }
		else if (floor === "high") { selectedModel = MANAGED_PROFILE_EVIDENCE.terra.model; level = "max"; }
		else { selectedModel = MANAGED_PROFILE_EVIDENCE.luna.model; level = "max"; }
	}
	const requestedExecutionMode: ExecutionMode = input.advisory?.parallelizable ? "parallel-agentic" : "standard";
	const executionMode = requestedExecutionMode === "parallel-agentic" && input.subagentToolsAvailable ? "parallel-agentic" : "standard";
	return {
		selectedModel, requestedThinkingLevel: level, executionMode, requestedExecutionMode,
		modelRouting: managed ? "managed-family" : "preserved-external",
		reason: `${signals.join(", ")}; quality-floor/cost-frontier policy`, signals,
		...(override.source ? { overrideSource: override.source } : {}),
		...(override.conflict ? { overrideConflict: true } : {}),
		advisoryThinkingLevel: advisoryRaw,
		...(advisoryRaw === "max" && !override.level ? { thinkingNormalization: "automatic max capped to xhigh" } : {}),
		...(requestedExecutionMode !== executionMode ? { executionFallbackReason: "Pi subagent tools unavailable" } : {}),
	};
}

function higher(a: ThinkingLevel, b: ThinkingLevel): ThinkingLevel { return THINKING_RANK[a] >= THINKING_RANK[b] ? a : b; }
function isLevel(value: unknown): value is ThinkingLevel { return THINKING_LEVELS.includes(value as ThinkingLevel); }

export interface ThinkingDecision { level: ThinkingLevel; reason: string }
export interface PiThinkingRuntime { setThinkingLevel(level: ThinkingLevel): void; getThinkingLevel?: () => string }
export interface ThinkingMetadata { requestedThinkingLevel: ThinkingLevel; effectiveThinkingLevel?: string; thinkingReason: string }
export function selectThinkingLevel(prompt: string, modelSuggestion?: ThinkingLevel): ThinkingDecision {
	if (/\b(?:refactor|multiples? modulos|arquitectura|debug|seguridad|performance|borra|elimina|destruye|uninstall)\b/i.test(prompt)) return { level: "high", reason: "complex, risky, or destructive task" };
	if (/\b(?:hola|dime la hora|que hora|explica brevemente|status)\b/i.test(prompt)) return { level: "low", reason: "simple low-risk prompt" };
	if (/\b(?:readme|tests?|pruebas|edita|actualiza|documenta)\b/i.test(prompt)) return { level: "medium", reason: "routine coding or documentation task" };
	if (modelSuggestion === "high") return { level: "high", reason: "router model classified prompt as high complexity" };
	return { level: "medium", reason: "uncertain prompt, conservative default" };
}
export function applyThinkingLevel(runtime: PiThinkingRuntime, level: ThinkingLevel): string | undefined { runtime.setThinkingLevel(level); return runtime.getThinkingLevel?.(); }
export function thinkingCliArgs(level: ThinkingLevel): string[] { return ["--thinking", level]; }
export function thinkingRpcCommand(level: ThinkingLevel): { type: "set_thinking_level"; level: ThinkingLevel } { return { type: "set_thinking_level", level }; }
export function createThinkingMetadata(requestedThinkingLevel: ThinkingLevel, effectiveThinkingLevel: string | undefined, thinkingReason: string): ThinkingMetadata { return { requestedThinkingLevel, ...(effectiveThinkingLevel ? { effectiveThinkingLevel } : {}), thinkingReason }; }
