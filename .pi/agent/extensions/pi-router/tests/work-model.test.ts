import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import {
	classifyWorkModelFailure,
	formatWorkModel,
	selectedWorkModelFromPiContext,
} from "../src/work-model.ts";

describe("work-model policy", () => {
	it("keeps router model independent from selected work model", () => {
		const ctx = { model: { provider: "openai-codex", id: "gpt-5.5" } };
		const workModel = selectedWorkModelFromPiContext(ctx);

		assert.deepEqual(workModel, { provider: "openai-codex", model: "gpt-5.5" });
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModel.provider, "llama-cpp");
		assert.equal(DEFAULT_ROUTER_CONFIG.routerModel.model, "gemma4");
	});

	it("formats default and changed work models without changing router policy", () => {
		assert.equal(formatWorkModel(undefined), "unknown");
		assert.equal(formatWorkModel({ provider: "pi-default" }), "pi-default");
		assert.equal(formatWorkModel({ provider: "openai-codex", model: "gpt-5.5" }), "openai-codex/gpt-5.5");
		assert.equal(formatWorkModel({ provider: "anthropic", model: "claude-sonnet" }), "anthropic/claude-sonnet");
	});

	it("classifies provider failures separately from router failures", () => {
		assert.deepEqual(classifyWorkModelFailure(new Error("Work model quota exhausted")), {
			type: "work-model",
			message: "Work model quota exhausted",
		});
		assert.deepEqual(classifyWorkModelFailure(new Error("router model unavailable: connection refused")), {
			type: "router",
			message: "router model unavailable: connection refused",
		});
	});
});
