import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DEFAULT_ROUTER_CONFIG,
	resolveRouterModel,
	resolveRouterState,
	routerStatusSummary,
	type WorkModelInfo,
} from "../src/config.ts";

describe("router configuration", () => {
	it("defaults to disabled routing with local gemma4 as the active router model", () => {
		assert.equal(DEFAULT_ROUTER_CONFIG.state, "off");
		assert.equal(DEFAULT_ROUTER_CONFIG.localMode, "on");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.local.provider, "llama-cpp");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.local.model, "gemma4");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.local.baseUrl, "http://127.0.0.1:11434/v1");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.local.timeoutMs, 15000);
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.local.fallbackMode, "passthrough-with-warning");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.local.maxInputChars, 12000);
		assert.deepEqual(resolveRouterModel(DEFAULT_ROUTER_CONFIG), DEFAULT_ROUTER_CONFIG.routerModels.local);
	});

	it("defines a remote GPT-5.4 Nano router profile through OpenAI Codex subscription auth", () => {
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.remote.provider, "openai-codex");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.remote.model, "gpt-5.4-nano");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModels.remote.baseUrl, "https://chatgpt.com/backend-api");
		assert.deepEqual(DEFAULT_ROUTER_CONFIG.routerModels.remote.fallbackModels, ["gpt-5.4-mini"]);
		assert.equal(resolveRouterModel({ ...DEFAULT_ROUTER_CONFIG, localMode: "off" }).model, "gpt-5.4-nano");
	});

	it("resolves global, session, and single-prompt overrides", () => {
		assert.deepEqual(resolveRouterState({ state: "off" }, { sessionState: "on" }), {
			state: "on",
			reason: "session override",
		});
		assert.deepEqual(resolveRouterState({ state: "on" }, { sessionState: "off" }), {
			state: "off",
			reason: "session override",
		});
		assert.deepEqual(resolveRouterState({ state: "on" }, { singlePromptBypass: true }), {
			state: "off",
			reason: "single prompt bypass",
		});
	});

	it("builds a compact status summary with router and work-model details", () => {
		const workModel: WorkModelInfo = { provider: "stratus", model: "stratus-code" };
		const summary = routerStatusSummary({
			config: { ...DEFAULT_ROUTER_CONFIG, state: "on" },
			workModel,
			degradedReason: "router timeout",
		});

		assert.equal(summary, "router:on local:on routerModel:llama-cpp/gemma4 workModel:stratus/stratus-code degraded:router timeout");
	});

	it("builds status summary with remote router model when local mode is off", () => {
		const summary = routerStatusSummary({
			config: { ...DEFAULT_ROUTER_CONFIG, state: "on", localMode: "off" },
		});

		assert.equal(summary, "router:on local:off routerModel:openai-codex/gpt-5.4-nano workModel:unknown");
	});

	it("shows the effective router model before the configured target when fallback resolves differently", () => {
		const summary = routerStatusSummary({
			config: { ...DEFAULT_ROUTER_CONFIG, state: "on", localMode: "off" },
			effectiveRouterModel: { provider: "openai-codex", model: "gpt-5.4-mini" },
		});

		assert.equal(summary, "router:on local:off routerModel:openai-codex/gpt-5.4-mini routerTarget:openai-codex/gpt-5.4-nano workModel:unknown");
	});
});
