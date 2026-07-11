import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import type { PiAiRuntime } from "../src/pi-ai-client.ts";
import { createRouterMetadata, routePromptWithModel as routeWithPiAi } from "../src/router-model.ts";

const HTTP_TEST_MODEL = { ...DEFAULT_ROUTER_CONFIG.routerModel, provider: "test-http", model: "test-router" };

function runtimeFromFetchLike(fetchLike: any): PiAiRuntime {
	return {
		modelRegistry: {
			find: (provider, model) => ({ provider, id: model, api: "test" }) as any,
			getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "test" }),
		},
		complete: (async (model: any, context: any) => {
			const messages = [
				...(context.systemPrompt ? [{ role: "system", content: context.systemPrompt }] : []),
				...context.messages.map((message: any) => ({ role: message.role, content: message.content.map((part: any) => part.text ?? "").join("\n") })),
			];
			const response = await fetchLike("pi-ai:test", { signal: new AbortController().signal, body: JSON.stringify({ model: model.id, messages, response_format: { type: "json_object" } }) });
			if (!response.ok) return { role: "assistant", stopReason: "error", errorMessage: `HTTP ${response.status ?? "error"}`, content: [], timestamp: Date.now() } as any;
			const payload = await response.json();
			return { role: "assistant", stopReason: "stop", content: [{ type: "text", text: payload?.choices?.[0]?.message?.content ?? "" }], timestamp: Date.now() } as any;
		}) as any,
	};
}

function routePromptWithModel(prompt: string, config: any, fetchLike?: any, context: any = {}, runtime?: PiAiRuntime) {
	return routeWithPiAi(prompt, config, context, runtime ?? runtimeFromFetchLike(fetchLike));
}

describe("router model", () => {
	it("uses the JSON router contract without concrete few-shot messages", async () => {
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

		const result = await routePromptWithModel("mejora el router de Pi", HTTP_TEST_MODEL, fetchLike);

		assert.equal(calls[0].url, "pi-ai:test");
		assert.equal(calls[0].body.model, "test-router");
		assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
		assert.equal(calls[0].body.messages.length, 2);
		assert.deepEqual(calls[0].body.messages.map((message: any) => message.role), ["system", "user"]);
		assert.doesNotMatch(JSON.stringify(calls[0].body.messages), /Arregla los tests|Fix the tests/);
		assert.doesNotMatch(calls[0].body.messages.at(-1).content, /<TASK>/);
		assert.deepEqual(JSON.parse(calls[0].body.messages.at(-1).content), { task: "mejora el router de Pi" });
		assert.equal(result.englishPrompt, "Improve the Pi router.");
		assert.equal(result.sourceLanguage, "es");
		assert.equal(result.thinkingLevel, "medium");
		assert.equal(result.translateFinalAnswer, true);
	});

	it("rejects leaked legacy Fix the tests output for an unrelated prompt", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: JSON.stringify({
				translation: "Fix the tests",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
				usedConversationContext: false,
				resolvedReferences: [],
				unresolvedReferences: [],
			}) } }] }),
		});

		const result = await routePromptWithModel("Probemos de nuevo", HTTP_TEST_MODEL, fetchLike as any);

		assert.equal(result.englishPrompt, "Probemos de nuevo");
		assert.match(result.degradedReason ?? "", /leaked legacy example output/);
	});

	it("falls back when routing drops quoted evidence", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: JSON.stringify({
				translation: "Review the router.", sourceLanguage: "es", thinkingLevel: "medium",
				translateFinalAnswer: true, usedConversationContext: false,
				resolvedReferences: [], unresolvedReferences: [],
			}) } }] }),
		});
		const original = 'Revisa el error "connection refused" en el router.';

		const result = await routePromptWithModel(original, HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.englishPrompt, original);
		assert.match(result.degradedReason ?? "", /lost required literal/);
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
			HTTP_TEST_MODEL,
			fetchLike,
			{ conversationSummary: "The current topic is adding a router details toggle." },
		);

		assert.equal(body.messages.length, 2);
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

		const result = await routePromptWithModel(`Revisa ${path} sin cambiarlo`, HTTP_TEST_MODEL, fetchLike);

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

		const result = await routePromptWithModel(`Revisa ${pathReference}`, HTTP_TEST_MODEL, fetchLike);

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

		const result = await routePromptWithModel(`Revisa ${pathReference}`, HTTP_TEST_MODEL, fetchLike);

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
			HTTP_TEST_MODEL,
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
			HTTP_TEST_MODEL,
			fetchLike,
		);

		assert.equal(result.englishPrompt, `Veo otro error:\n${fencedBlock}\nRevisa ambos bugs.`);
		assert.match(result.degradedReason ?? "", /placeholder mismatch/);
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

		const result = await routePromptWithModel("continua con eso", HTTP_TEST_MODEL, fetchLike);

		assert.deepEqual(result.unresolvedReferences, ["eso"]);
		const metadata = createRouterMetadata({
			originalPrompt: "continua con eso",
			result,
			routerModel: HTTP_TEST_MODEL,
		});
		assert.deepEqual(metadata.unresolvedReferences, ["eso"]);
	});

	it("instructs the router model to preserve technical tokens and markdown layout", async () => {
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

		await routePromptWithModel("corre `pytest tests/test_cli.py`", HTTP_TEST_MODEL, fetchLike);

		assert.match(routerPrompt, /Preserve commands, paths, identifiers, quoted strings, exact placeholders, and error messages/);
		assert.match(routerPrompt, /Preserve markdown formatting, blank lines, headings, blockquotes, bullet\/numbered list markers, and line breaks/);
		assert.match(routerPrompt, /fenced blocks inside the task are part of the latest user prompt data/);
	});

	it("falls back to the original prompt when translation collapses user line layout", async () => {
		const originalPrompt = "revisa mi ultima interaccion con pi agent:\n" +
			"durante la traduccion se perdio mucho formato, revisa el problema y tratemos de arreglarlo.";
		const collapsedTranslation = "Review my last interaction with Pi Agent: during the translation, a lot of formatting was lost; review the problem and let's try to fix it.";
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: JSON.stringify({
					translation: collapsedTranslation,
					sourceLanguage: "es",
					thinkingLevel: "medium",
					translateFinalAnswer: true,
				}) } }],
			}),
		});

		const result = await routePromptWithModel(originalPrompt, HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.englishPrompt, originalPrompt);
		assert.equal(result.sourceLanguage, "es");
		assert.equal(result.translateFinalAnswer, true);
		assert.match(result.degradedReason ?? "", /router model lost prompt formatting/);
	});

	it("falls back instead of parsing the first JSON object from contaminated router output", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: 'No, no estoy asumiendo nada.\n<|im_end|>\n<TASK>Entonces, ¿qué debo hacer?</TASK>\n{"translation":"What should I do then?","sourceLanguage":"es","thinkingLevel":"medium","translateFinalAnswer":true}' } }],
			}),
		});

		const result = await routePromptWithModel("Dame el estado actual del router", HTTP_TEST_MODEL, fetchLike);

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
			routerModel: HTTP_TEST_MODEL,
		});

		assert.deepEqual(metadata, {
			originalPrompt: "mejora el router",
			transformedPrompt: "Improve the router.",
			sourceLanguage: "es",
			routerModel: "test-http/test-router",
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

		await routePromptWithModel("hello", HTTP_TEST_MODEL, fetchLike);

		assert.ok(signal instanceof AbortSignal);
	});

	it("falls back to passthrough when the router model is unavailable or input is oversized", async () => {
		const unavailable = await routePromptWithModel(
			"hola",
			HTTP_TEST_MODEL,
			async () => { throw new Error("connection refused"); },
		);
		const oversized = await routePromptWithModel(
			"x".repeat(HTTP_TEST_MODEL.maxInputChars + 1),
			HTTP_TEST_MODEL,
			async () => { throw new Error("should not be called"); },
		);

		assert.equal(unavailable.englishPrompt, "hola");
		assert.equal(unavailable.degradedReason, "router model unavailable: connection refused");
		assert.equal(oversized.degradedReason, "input exceeds router maxInputChars: 12001 > 12000");
	});

	it("routes remote OpenAI Codex subscription models through Pi modelRegistry and complete", async () => {
		let fetched = false;
		let completedModel: any;
		let completedContext: any;
		let completedOptions: any;
		const remoteModel = DEFAULT_ROUTER_CONFIG.routerModel;
		const modelRegistry = {
			find: (provider: string, model: string) => ({ provider, id: model, api: "openai-codex-responses", baseUrl: "https://chatgpt.com/backend-api" }) as any,
			getApiKeyAndHeaders: async () => ({ ok: true as const, apiKey: "codex-oauth-token", headers: { "x-test": "header" } }),
		};
		const complete = async (model: any, context: any, options: any) => {
			completedModel = model;
			completedContext = context;
			completedOptions = options;
			return {
				stopReason: "stop",
				content: [{ type: "text", text: JSON.stringify({
					sourceLanguage: "es",
					translation: "Improve the router.",
					thinkingLevel: "medium",
					translateFinalAnswer: true,
					usedConversationContext: false,
					resolvedReferences: [],
					unresolvedReferences: [],
				}) }],
			} as any;
		};

		const result = await routePromptWithModel(
			"mejora el router",
			remoteModel,
			async () => { fetched = true; throw new Error("fetch should not be used"); },
			{},
			{ modelRegistry, complete: complete as any },
		);

		assert.equal(fetched, false);
		assert.equal(completedModel.provider, "openai-codex");
		assert.equal(completedModel.id, "gpt-5.4-mini");
		assert.equal(completedOptions.apiKey, "codex-oauth-token");
		assert.deepEqual(completedOptions.headers, { "x-test": "header" });
		assert.match(completedContext.systemPrompt, /Return ONLY one JSON object/);
		assert.deepEqual(JSON.parse(completedContext.messages[0].content[0].text), { task: "mejora el router" });
		assert.equal(result.englishPrompt, "Improve the router.");
	});

	it("does not try unavailable alternate remote models", async () => {
		const remoteModel = DEFAULT_ROUTER_CONFIG.routerModel;
		const requestedModels: string[] = [];
		let completeCalls = 0;
		const modelRegistry = {
			find: (provider: string, model: string) => {
				requestedModels.push(`${provider}/${model}`);
				return undefined;
			},
			getApiKeyAndHeaders: async () => ({ ok: true as const, apiKey: "codex-oauth-token" }),
		};
		const complete = async () => {
			completeCalls += 1;
			throw new Error("complete should not be called");
		};

		const result = await routePromptWithModel("mejora el router", remoteModel, undefined as any, {}, { modelRegistry, complete: complete as any });

		assert.deepEqual(requestedModels, ["openai-codex/gpt-5.4-mini"]);
		assert.equal(completeCalls, 0);
		assert.equal(result.englishPrompt, "mejora el router");
		assert.equal(result.degradedReason, "router model unavailable: Pi model not found: openai-codex/gpt-5.4-mini");
	});
});
