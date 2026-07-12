import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	parseThinkingOverride,
	resolveWorkProfile,
	THINKING_LEVELS,
	MANAGED_PROFILE_EVIDENCE,
} from "../src/thinking.ts";

const advisory = (thinkingLevel: any = "medium", extra: any = {}) => ({
	thinkingLevel, taskComplexity: "moderate", taskRisk: "low", expectedWorkflow: "coding",
	suggestedWorkModelTier: "terra", parallelizable: false, ...extra,
});

describe("adaptive thinking policy", () => {
	it("supports Pi's complete level vocabulary without collapsing xhigh", () => {
		assert.deepEqual(THINKING_LEVELS, ["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
		assert.equal(resolveWorkProfile({ prompt: "deep security review", currentModel: "anthropic/claude", advisory: advisory("xhigh") }).requestedThinkingLevel, "xhigh");
	});

	it("parses bilingual controls, precedence, invalid controls, and ignores quoted examples", () => {
		for (const [prompt, level] of [["@thinking:off hi", "off"], ["@thinking:xhigh revisa", "xhigh"], ["Use maximum reasoning", "max"], ["usa todas tus capacidades", "max"], ["usa esfuerzo alto", "high"]] as const)
			assert.equal(parseThinkingOverride(prompt).level, level);
		const conflict = parseThinkingOverride("@thinking:high use maximum reasoning");
		assert.equal(conflict.level, "high"); assert.equal(conflict.conflict, true);
		assert.equal(parseThinkingOverride('Explain the example "@thinking:max"').level, undefined);
		assert.equal(parseThinkingOverride('Discuss the phrase "use maximum reasoning"').level, undefined);
		assert.match(parseThinkingOverride("@thinking:turbo do it").error ?? "", /off, minimal, low, medium, high, xhigh, max/);
		assert.equal(parseThinkingOverride("@thinking:max do it").prompt, "do it");
	});

	it("honors every explicit managed-family syntax level before automatic floors", () => {
		for (const level of THINKING_LEVELS) {
			const decision = resolveWorkProfile({
				prompt: `@thinking:${level} perform an exhaustive security review with maximum reasoning`,
				currentModel: "openai-codex/gpt-5.6-terra",
				advisory: advisory("max", { taskComplexity: "complex", taskRisk: "high" }),
			});
			assert.equal(decision.requestedThinkingLevel, level, level);
			assert.equal(decision.overrideSource, "syntax");
		}
		const conflict = resolveWorkProfile({ prompt: "@thinking:high use maximum reasoning", currentModel: "openai-codex/gpt-5.6-sol", advisory: advisory("max") });
		assert.equal(conflict.requestedThinkingLevel, "high");
	});

	it("uses adaptive floors while preserving external models", () => {
		const cases = [
			["say hello", advisory("low", { taskComplexity: "trivial", expectedWorkflow: "answer" }), "low"],
			["do that", advisory("low"), "medium"],
			["plan a multi-file migration", advisory("low"), "high"],
			["perform an exhaustive repository review", advisory("low"), "xhigh"],
		] as const;
		for (const [prompt, adv, level] of cases) {
			const decision = resolveWorkProfile({ prompt, currentModel: "anthropic/claude", advisory: adv as any });
			assert.equal(decision.requestedThinkingLevel, level); assert.equal(decision.modelRouting, "preserved-external");
			assert.equal(decision.selectedModel, "anthropic/claude");
		}
	});

	it("uses only the managed coding frontier and reserves Sol Max for explicit intent", () => {
		const cases = [
			["update this clear README", advisory("low", { taskComplexity: "routine" }), "gpt-5.6-luna", "max"],
			["implement a bounded multi-file feature", advisory("high", { taskComplexity: "complex" }), "gpt-5.6-terra", "max"],
			["deep architecture and security review", advisory("low"), "gpt-5.6-sol", "xhigh"],
			["use all your capabilities to implement this", advisory("low"), "gpt-5.6-sol", "max"],
		] as const;
		for (const [prompt, adv, model, level] of cases) {
			const d = resolveWorkProfile({ prompt, currentModel: "openai-codex/gpt-5.6-terra", advisory: adv as any });
			assert.equal(d.selectedModel, `openai-codex/${model}`); assert.equal(d.requestedThinkingLevel, level);
		}
	});

	it("prevents advisory dominated profiles and automatic max", () => {
		for (const adv of [advisory("low", { suggestedWorkModelTier: "luna" }), advisory("xhigh", { suggestedWorkModelTier: "terra" }), advisory("medium", { suggestedWorkModelTier: "sol" }), advisory("high", { suggestedWorkModelTier: "sol" }), advisory("max", { suggestedWorkModelTier: "sol" })]) {
			const d = resolveWorkProfile({ prompt: "routine clear coding update", currentModel: "openai-codex/gpt-5.6-sol", advisory: adv as any });
			assert.equal(d.selectedModel, "openai-codex/gpt-5.6-luna"); assert.equal(d.requestedThinkingLevel, "max");
		}
	});

	it("keeps execution modes separate and evidence auditable", () => {
		let d = resolveWorkProfile({ prompt: "independently review these modules", currentModel: "openai-codex/gpt-5.6-sol", advisory: advisory("xhigh", { parallelizable: true }), subagentToolsAvailable: true });
		assert.equal(d.executionMode, "parallel-agentic"); assert.doesNotMatch(d.reason, /ultra/i);
		d = resolveWorkProfile({ prompt: "independently review these modules", currentModel: "openai-codex/gpt-5.6-sol", advisory: advisory("xhigh", { parallelizable: true }) });
		assert.equal(d.executionMode, "standard"); assert.match(d.executionFallbackReason ?? "", /unavailable/);
		assert.equal(MANAGED_PROFILE_EVIDENCE.luna.cost, 537); assert.equal(MANAGED_PROFILE_EVIDENCE.solMax.score, 80);
	});
});
