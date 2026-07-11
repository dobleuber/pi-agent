import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG, resolveRouterState, routerStatusSummary, type WorkModelInfo } from "../src/config.ts";

describe("router configuration", () => {
	it("defaults to disabled routing with GPT-5.4 Mini as the sole router model", () => {
		assert.equal(DEFAULT_ROUTER_CONFIG.state, "off");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModel.provider, "openai-codex");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModel.model, "gpt-5.4-mini");
		assert.equal("baseUrl" in DEFAULT_ROUTER_CONFIG.routerModel, false);
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModel.timeoutMs, 15000);
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModel.fallbackMode, "passthrough-with-warning");
	});

	it("resolves global, session, and single-prompt overrides", () => {
		assert.deepEqual(resolveRouterState({ state: "off" }, { sessionState: "on" }), { state: "on", reason: "session override" });
		assert.deepEqual(resolveRouterState({ state: "on" }, { sessionState: "off" }), { state: "off", reason: "session override" });
		assert.deepEqual(resolveRouterState({ state: "on" }, { singlePromptBypass: true }), { state: "off", reason: "single prompt bypass" });
	});

	it("builds a compact status summary without local-mode details", () => {
		const workModel: WorkModelInfo = { provider: "stratus", model: "stratus-code" };
		const summary = routerStatusSummary({ config: { ...DEFAULT_ROUTER_CONFIG, state: "on" }, workModel, degradedReason: "router timeout" });
		assert.equal(summary, "router:on routerModel:openai-codex/gpt-5.4-mini workModel:stratus/stratus-code degraded:router timeout");
	});
});
