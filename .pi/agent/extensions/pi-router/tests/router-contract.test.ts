import { it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import { routePromptWithModel } from "../src/router-model.ts";

function runtime(payload: any): any { return { modelRegistry: { find: (provider: string, id: string) => ({ provider, id, api: "test" }), getApiKeyAndHeaders: async () => ({ ok: true }) }, complete: async () => ({ role: "assistant", content: [{ type: "text", text: JSON.stringify(payload) }] }) }; }

it("normalizes the expanded advisory contract and forces Spanish/mixed translation", async () => {
	for (const sourceLanguage of ["es", "mixed"]) {
		const result = await routePromptWithModel("respuesta con mucha variedad", DEFAULT_ROUTER_CONFIG.routerModel, {}, runtime({ translation: "answer with much variety", sourceLanguage, thinkingLevel: "xhigh", translateFinalAnswer: false, thinkingReason: "review", taskComplexity: "difficult", taskRisk: "high", expectedWorkflow: "review", suggestedWorkModelTier: "sol", parallelizable: true, parallelizationReason: "independent modules" }));
		assert.equal(result.thinkingLevel, "xhigh"); assert.equal(result.translateFinalAnswer, true);
		assert.match(result.translationNormalization ?? "", /forced/); assert.equal(result.suggestedWorkModelTier, "sol"); assert.equal(result.parallelizable, true);
	}
});

it("uses safe advisory defaults when expanded fields are missing", async () => {
	const result = await routePromptWithModel("hello", DEFAULT_ROUTER_CONFIG.routerModel, {}, runtime({ translation: "hello", sourceLanguage: "unknown", thinkingLevel: "nonsense", translateFinalAnswer: false }));
	assert.equal(result.thinkingLevel, "medium"); assert.equal(result.taskComplexity, "unknown"); assert.equal(result.taskRisk, "unknown"); assert.equal(result.suggestedWorkModelTier, "terra"); assert.equal(result.translateFinalAnswer, false);
});
