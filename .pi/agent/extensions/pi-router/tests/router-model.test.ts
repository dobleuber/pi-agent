import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import { createRouterMetadata, routePromptWithModel } from "../src/router-model.ts";

describe("local router model", () => {
	it("calls llama.cpp gemma4 with chat-role few-shot messages and JSON-only controls", async () => {
		const calls: Array<{ url: string; body: any }> = [];
		const fetchLike = async (url: string, init: any) => {
			calls.push({ url, body: JSON.parse(init.body) });
			return {
				ok: true,
				json: async () => ({
					choices: [{
						message: {
							content: JSON.stringify({
								sourceLanguage: "es",
								translation: "Improve the Pi router.",
								thinkingLevel: "medium",
								translateFinalAnswer: true,
								usedConversationContext: false,
								resolvedReferences: [],
								unresolvedReferences: [],
							}),
						},
					}],
				}),
			};
		};

		const result = await routePromptWithModel("mejora el router de Pi", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(calls[0].url, "http://127.0.0.1:11434/v1/chat/completions");
		assert.equal(calls[0].body.model, "gemma4");
		assert.deepEqual(calls[0].body.stop, ["<|im_end|>"]);
		assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
		assert.equal(calls[0].body.messages.length, 4);
		assert.deepEqual(calls[0].body.messages.map((message: any) => message.role), ["system", "user", "assistant", "user"]);
		assert.doesNotMatch(calls[0].body.messages.at(-1).content, /<TASK>/);
		assert.deepEqual(JSON.parse(calls[0].body.messages.at(-1).content), { task: "mejora el router de Pi" });
		assert.equal(result.englishPrompt, "Improve the Pi router.");
		assert.equal(result.sourceLanguage, "es");
		assert.equal(result.thinkingLevel, "medium");
		assert.equal(result.translateFinalAnswer, true);
	});

	it("sends conversation context only for faithful reference resolution", async () => {
		let body: any;
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({
					choices: [{
						message: {
							content: JSON.stringify({
								sourceLanguage: "es",
								englishPrompt: "Add the router details toggle to the Pi router.",
								thinkingLevel: "medium",
								translateFinalAnswer: true,
								usedConversationContext: true,
								resolvedReferences: ["eso = router details toggle"],
								unresolvedReferences: [],
							}),
						},
					}],
				}),
			};
		};

		const result = await routePromptWithModel(
			"agrega eso al router de Pi",
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
			{ conversationSummary: "The current topic is adding a router details toggle." },
		);

		assert.equal(body.messages.length, 4);
		assert.match(body.messages[0].content, /Use conversation context only to resolve references/);
		assert.deepEqual(JSON.parse(body.messages.at(-1).content), {
			task: "agrega eso al router de Pi",
			conversationContext: "The current topic is adding a router details toggle.",
		});
		assert.equal(result.usedConversationContext, true);
		assert.deepEqual(result.resolvedReferences, ["eso = router details toggle"]);
		assert.deepEqual(result.unresolvedReferences, []);
	});

	it("masks paths before routing and restores them in the translated prompt", async () => {
		let body: any;
		const path = "openspec/changes/mejorar-naturalidad-salida-hablada-roger/";
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({
					choices: [{ message: { content: '{"translation":"Review §P0§ without changing it.","sourceLanguage":"es","thinkingLevel":"medium","translateFinalAnswer":true}' } }],
				}),
			};
		};

		const result = await routePromptWithModel(`Revisa ${path} sin cambiarlo`, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		const routedInput = JSON.parse(body.messages.at(-1).content);
		assert.doesNotMatch(routedInput.task, /mejorar-naturalidad-salida-hablada-roger/);
		assert.match(routedInput.task, /§P0§/);
		assert.doesNotMatch(routedInput.task, /__PI_ROUTER_PROTECTED_0__/);
		assert.equal(result.englishPrompt, `Review ${path} without changing it.`);
	});

	it("preserves Pi @ path references when masking paths before routing", async () => {
		let body: any;
		const pathReference = "@src/router-model.ts";
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({
					choices: [{ message: { content: '{"translation":"Review §P0§","sourceLanguage":"es","thinkingLevel":"medium","translateFinalAnswer":true}' } }],
				}),
			};
		};

		const result = await routePromptWithModel(`Revisa ${pathReference}`, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		const routedInput = JSON.parse(body.messages.at(-1).content);
		assert.doesNotMatch(routedInput.task, /src\/router-model\.ts/);
		assert.match(routedInput.task, /§P0§/);
		assert.doesNotMatch(routedInput.task, /__PI_ROUTER_PROTECTED_0__/);
		assert.equal(result.englishPrompt, `Review ${pathReference}`);
	});

	it("restores opaque protected placeholders while routing", async () => {
		const pathReference = ".pi/agent/extensions/pi-router/src/final-answer.ts";
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: '{"translation":"Review §P0§","sourceLanguage":"es","thinkingLevel":"medium","translateFinalAnswer":true}' } }],
			}),
		});

		const result = await routePromptWithModel(`Revisa ${pathReference}`, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.englishPrompt, `Review ${pathReference}`);
	});

	it("masks fenced blocks before routing and restores them when the model preserves the placeholder", async () => {
		let body: any;
		const fencedBlock = [
			"```",
			"No. I onlly updated this repository’s project-local extension files:",
			"",
			" - __PI_ROUTER_PROTEGIDO_0__",
			" - __PI_ROUTER_PROTEGIDO_1__",
			"```",
		].join("\n");
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({
					choices: [{ message: { content: '{"translation":"Review both bugs. __PI_ROUTER_PRESERVED_BLOCK_0__","sourceLanguage":"es","thinkingLevel":"high","translateFinalAnswer":true}' } }],
				}),
			};
		};

		const result = await routePromptWithModel(
			`Veo otro error:\n${fencedBlock}\nRevisa ambos bugs.`,
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
		);

		const routedInput = JSON.parse(body.messages.at(-1).content);
		assert.doesNotMatch(routedInput.task, /onlly updated/);
		assert.match(routedInput.task, /__PI_ROUTER_PRESERVED_BLOCK_0__/);
		assert.equal(result.englishPrompt, `Review both bugs. ${fencedBlock}`);
	});

	it("keeps user-provided fenced blocks when the router model drops their placeholders", async () => {
		const fencedBlock = [
			"```",
			"No. I onlly updated this repository’s project-local extension files:",
			"",
			" - __PI_ROUTER_PROTEGIDO_0__",
			" - __PI_ROUTER_PROTEGIDO_1__",
			"```",
		].join("\n");
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: '{"translation":"Review both bugs.","sourceLanguage":"es","thinkingLevel":"high","translateFinalAnswer":true}' } }],
			}),
		});

		const result = await routePromptWithModel(
			`Veo otro error:\n${fencedBlock}\nRevisa ambos bugs.`,
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
		);

		assert.match(result.englishPrompt, /^Review both bugs\./);
		assert.match(result.englishPrompt, /User-provided fenced content:/);
		assert.match(result.englishPrompt, /No\. I onlly updated this repository’s project-local extension files:/);
		assert.match(result.englishPrompt, /__PI_ROUTER_PROTEGIDO_0__/);
	});

	it("records unresolved references without inventing intent", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({
				choices: [{
					message: {
						content: JSON.stringify({
							sourceLanguage: "es",
							englishPrompt: "Continue with that.",
							thinkingLevel: "medium",
							translateFinalAnswer: true,
							usedConversationContext: false,
							resolvedReferences: [],
							unresolvedReferences: ["eso"],
						}),
					},
				}],
			}),
		});

		const result = await routePromptWithModel("continua con eso", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.deepEqual(result.unresolvedReferences, ["eso"]);
		const metadata = createRouterMetadata({
			originalPrompt: "continua con eso",
			result,
			routerModel: DEFAULT_ROUTER_CONFIG.routerModel,
		});
		assert.deepEqual(metadata.unresolvedReferences, ["eso"]);
	});

	it("instructs the router model to preserve technical tokens", async () => {
		let routerPrompt = "";
		const fetchLike = async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			routerPrompt = body.messages[0].content;
			return {
				ok: true,
				json: async () => ({
					choices: [{ message: { content: '{"translation":"Run `pytest tests/test_cli.py`.","sourceLanguage":"es","thinkingLevel":"low","translateFinalAnswer":true}' } }],
				}),
			};
		};

		await routePromptWithModel("corre `pytest tests/test_cli.py`", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.match(routerPrompt, /Preserve commands, paths, identifiers, quoted strings, exact placeholders, and error messages/);
		assert.match(routerPrompt, /fenced blocks inside the task are part of the latest user prompt data/);
	});

	it("falls back instead of parsing the first JSON object from contaminated router output", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: 'No, no estoy asumiendo nada.\n<|im_end|>\n<TASK>Entonces, ¿qué debo hacer?</TASK>\n{"translation":"What should I do then?","sourceLanguage":"es","thinkingLevel":"medium","translateFinalAnswer":true}' } }],
			}),
		});

		const result = await routePromptWithModel("Dame el estado actual del router", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.englishPrompt, "Dame el estado actual del router");
		assert.match(result.degradedReason ?? "", /router model returned invalid JSON/);
	});

	it("creates metadata for logs and details inspection", () => {
		const metadata = createRouterMetadata({
			originalPrompt: "mejora el router",
			result: {
				sourceLanguage: "es",
				englishPrompt: "Improve the router.",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
				degradedReason: "fallback",
			},
			routerModel: DEFAULT_ROUTER_CONFIG.routerModel,
		});

		assert.deepEqual(metadata, {
			originalPrompt: "mejora el router",
			transformedPrompt: "Improve the router.",
			sourceLanguage: "es",
			routerModel: "llama-cpp/gemma4",
			requestedThinkingLevel: "medium",
			fallback: "fallback",
		});
	});

	it("passes an abort signal to bound router model calls", async () => {
		let signal: AbortSignal | undefined;
		const fetchLike = async (_url: string, init: any) => {
			signal = init.signal;
			return {
				ok: true,
				json: async () => ({
					choices: [{ message: { content: '{"englishPrompt":"Hello","sourceLanguage":"en","thinkingLevel":"low","translateFinalAnswer":true}' } }],
				}),
			};
		};

		await routePromptWithModel("hello", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.ok(signal instanceof AbortSignal);
	});

	it("falls back to passthrough when the router model is unavailable or input is oversized", async () => {
		const unavailable = await routePromptWithModel(
			"hola",
			DEFAULT_ROUTER_CONFIG.routerModel,
			async () => { throw new Error("connection refused"); },
		);
		const oversized = await routePromptWithModel(
			"x".repeat(DEFAULT_ROUTER_CONFIG.routerModel.maxInputChars + 1),
			DEFAULT_ROUTER_CONFIG.routerModel,
			async () => { throw new Error("should not be called"); },
		);

		assert.equal(unavailable.englishPrompt, "hola");
		assert.equal(unavailable.degradedReason, "router model unavailable: connection refused");
		assert.equal(oversized.degradedReason, "input exceeds router maxInputChars: 12001 > 12000");
	});
});
