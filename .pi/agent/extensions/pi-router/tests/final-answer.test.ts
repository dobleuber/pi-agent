import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import { translateFinalAnswerToSpanish } from "../src/final-answer.ts";

describe("final answer translation", () => {
	it("uses the local router model to translate final English answers to Spanish", async () => {
		let body: any;
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "Listo. Los cambios están aplicados." } }] }),
			};
		};

		const result = await translateFinalAnswerToSpanish(
			"Done. The changes are applied.",
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
		);

		assert.equal(body.model, "gemma4");
		assert.equal(body.messages.length, 1);
		assert.equal(body.messages[0].role, "user");
		assert.match(body.messages[0].content, /BEGIN_PI_ROUTER_TRANSLATION_TEXT/);
		assert.match(body.messages[0].content, /Done\. The changes are applied\./);
		assert.equal(result.spanishAnswer, "Listo. Los cambios están aplicados.");
		assert.equal(result.englishAnswer, "Done. The changes are applied.");
	});

	it("uses a single generic translation prompt without few-shot examples", async () => {
		let body: any;
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "Listo. La implementación está completa." } }] }),
			};
		};

		await translateFinalAnswerToSpanish(
			"Done. The implementation is complete.",
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
		);

		assert.equal(body.messages.length, 1);
		assert.equal(body.messages[0].role, "user");
		assert.match(body.messages[0].content, /Translate the text between ---BEGIN_PI_ROUTER_TRANSLATION_TEXT--- and ---END_PI_ROUTER_TRANSLATION_TEXT---/);
		assert.match(body.messages[0].content, /Done\. The implementation is complete\./);
		assert.doesNotMatch(body.messages[0].content, /The router now translates the prompt/);
		assert.doesNotMatch(body.messages[0].content, /<SPANISH>Listo/);
	});

	it("sends technical content in the isolated translation payload", async () => {
		let translatorPrompt = "";
		const fetchLike = async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			translatorPrompt = body.messages[0].content;
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "Ejecuta `pytest tests/test_cli.py`." } }] }),
			};
		};

		await translateFinalAnswerToSpanish("Run `pytest tests/test_cli.py`.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.match(translatorPrompt, /Run __PI_ROUTER_INLINE_0__\./);
		assert.doesNotMatch(translatorPrompt, /pytest tests\/test_cli\.py/);
	});

	it("cleans chat-template artifacts from translated final answers", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "<SPANISH>Listo.</SPANISH><|im_end|>\n<|im_start|>assistant\nbasura" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, "Listo.");
	});

	it("falls back instead of showing echoed text payloads", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "<TEXT>Done.</TEXT>" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, "Done.");
		assert.equal(result.degradedReason, "final answer translation unavailable: echoed text payload");
	});

	it("extracts translated content when the model echoes translation delimiters", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "---BEGIN_PI_ROUTER_TRANSLATION_TEXT---\nListo.\n---END_PI_ROUTER_TRANSLATION_TEXT---" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, "Listo.");
		assert.equal(result.degradedReason, undefined);
	});

	it("falls back when echoed translation delimiters contain the original untranslated text", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "---BEGIN_PI_ROUTER_TRANSLATION_TEXT---\nDone.\n---END_PI_ROUTER_TRANSLATION_TEXT---" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, "Done.");
		assert.equal(result.degradedReason, "final answer translation unavailable: untranslated output");
	});

	it("falls back instead of showing identical untranslated output", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "Done." } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, "Done.");
		assert.equal(result.degradedReason, "final answer translation unavailable: untranslated output");
	});

	it("uses a delimiter that is not broken by XML-like content in the answer", async () => {
		let body: any;
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "Listo." } }] }),
			};
		};

		await translateFinalAnswerToSpanish("Done. Literal </TEXT> marker.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.match(body.messages[0].content, /BEGIN_PI_ROUTER_TRANSLATION_TEXT/);
		assert.match(body.messages[0].content, /Done\. Literal <\/TEXT> marker\./);
		assert.doesNotMatch(body.messages[0].content, /<TEXT>Done\. Literal <\/TEXT> marker\.<\/TEXT>/);
		assert.match(body.messages[0].content, /END_PI_ROUTER_TRANSLATION_TEXT/);
	});

	it("translates prose chunks while preserving fenced code blocks unchanged", async () => {
		const bodies: any[] = [];
		const fetchLike = async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			bodies.push(body);
			return {
				ok: true,
				json: async () => ({
					choices: [{ message: { content: [
						"Primer párrafo.",
						"",
						"__PI_ROUTER_PRESERVED_BLOCK_0__",
						"",
						"Segundo párrafo.",
					].join("\n") } }],
				}),
			};
		};

		const answer = [
			"First paragraph.",
			"",
			"```ts",
			"const value = \"keep me exact\";",
			"```",
			"",
			"Second paragraph.",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(bodies.length, 1);
		assert.doesNotMatch(bodies[0].messages[0].content, /keep me exact/);
		assert.match(bodies[0].messages[0].content, /__PI_ROUTER_PRESERVED_BLOCK_0__/);
		assert.equal(result.spanishAnswer, [
			"Primer párrafo.",
			"",
			"```ts",
			"const value = \"keep me exact\";",
			"```",
			"",
			"Segundo párrafo.",
		].join("\n"));
	});

	it("translates short prose labels around fenced code blocks as one contextual request", async () => {
		const bodies: any[] = [];
		const fetchLike = async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			bodies.push(body);
			const prompt = body.messages[0].content;
			if (prompt.includes("Correct") && prompt.includes("It appears") && prompt.includes("Examples there include")) {
				return {
					ok: true,
					json: async () => ({ choices: [{ message: { content: [
						"Correcto: el código principal de Roger no está en este repositorio `pi-agent`.",
						"",
						"Parece vivir en tu repositorio separado:",
						"",
						"__PI_ROUTER_PRESERVED_BLOCK_0__",
						"",
						"Remoto:",
						"",
						"__PI_ROUTER_PRESERVED_BLOCK_1__",
						"",
						"Ruta del paquete principal Roger:",
						"",
						"__PI_ROUTER_PRESERVED_BLOCK_2__",
						"",
						"Los ejemplos allí incluyen:",
						"",
						"__PI_ROUTER_PRESERVED_BLOCK_3__",
						"",
						"Este repositorio (`pi-agent`) solo tiene manejo de integración relacionado con Roger.",
					].join("\n") } }] }),
				};
			}
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: prompt.match(/---BEGIN_PI_ROUTER_TRANSLATION_TEXT---\n([\s\S]*?)\n---END_PI_ROUTER_TRANSLATION_TEXT---/)?.[1] ?? "" } }] }),
			};
		};

		const answer = [
			"Correct — Roger’s main code is **not in this `pi-agent` repository**.",
			"",
			"It appears to live in your separate repo:",
			"",
			"```txt",
			"/home/dobleuber/Projects/personal/pi-extensions/",
			"```",
			"",
			"Remote:",
			"",
			"```txt",
			"git@github.com:dobleuber/pi-extensions.git",
			"```",
			"",
			"Main Roger package path:",
			"",
			"```txt",
			"/home/dobleuber/Projects/personal/pi-extensions/src/roger/",
			"```",
			"",
			"Examples there include:",
			"",
			"```txt",
			"src/roger/cli.py",
			"src/roger/voice_loop.py",
			"```",
			"",
			"This repo (`pi-agent`) only has Roger-related integration handling.",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(bodies.length, 1);
		assert.doesNotMatch(bodies[0].messages[0].content, /home\/dobleuber\/Projects/);
		assert.match(bodies[0].messages[0].content, /__PI_ROUTER_PRESERVED_BLOCK_0__/);
		assert.match(result.spanishAnswer, /^Correcto: el código principal de Roger/);
		assert.match(result.spanishAnswer, /Parece vivir en tu repositorio separado:/);
		assert.match(result.spanishAnswer, /```txt\n\/home\/dobleuber\/Projects\/personal\/pi-extensions\/\n```/);
		assert.match(result.spanishAnswer, /Los ejemplos allí incluyen:/);
		assert.doesNotMatch(result.degradedReason ?? "", /untranslated output/);
	});

	it("keeps original prose chunks when a chunk translation fails", async () => {
		let call = 0;
		const fetchLike = async () => {
			call += 1;
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: call === 1 ? "Primer párrafo." : "" } }] }),
			};
		};

		const result = await translateFinalAnswerToSpanish("First paragraph.\n\nSecond paragraph.", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, "Primer párrafo.\n\nSecond paragraph.");
		assert.match(result.degradedReason!, /chunk 2/);
		assert.match(result.degradedReason!, /empty response/);
	});

	it("retries failed long contextual chunks by splitting them smaller", async () => {
		const calls: string[] = [];
		const fetchLike = async (_url: string, init: any) => {
			const prompt = JSON.parse(init.body).messages[0].content;
			const chunk = prompt.match(/---BEGIN_PI_ROUTER_TRANSLATION_TEXT---\n([\s\S]*?)\n---END_PI_ROUTER_TRANSLATION_TEXT---/)?.[1] ?? "";
			calls.push(chunk);
			if (chunk.length > 1200) {
				throw new Error("This operation was aborted");
			}
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: `TRADUCIDO:${calls.length}` } }] }),
			};
		};

		const longAnswer = [
			"Yes — the weird parts are mostly defensive changes around an AI-vision model that sometimes misses obvious UI text.",
			"",
			"### 1. Why remove `ensureNsolidWelcomeOnlyExpanded()`?",
			"",
			"Because it was just a thin wrapper that moved logic inline and should not change behavior. ".repeat(12),
			"",
			"```js",
			"async function ensureNsolidWelcomeOnlyExpanded(agent) { return agent }",
			"```",
			"",
			"### 2. Why retry visibility checks?",
			"",
			"Because the sections are expected to exist, and a single model miss should not be trusted as final. ".repeat(12),
			"",
			"One caveat: retry and scroll before failing clearly.",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(longAnswer, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.ok(calls.some((chunk) => chunk.length > 1200), "expected the initial long chunk attempt");
		assert.ok(calls.filter((chunk) => chunk.length <= 1200).length >= 2, "expected smaller retry chunks");
		assert.doesNotMatch(result.spanishAnswer, /Yes — the weird parts/);
		assert.doesNotMatch(result.degradedReason ?? "", /This operation was aborted/);
	});

	it("splits long prose chunks before translating", async () => {
		const bodies: any[] = [];
		const longAnswer = Array.from({ length: 90 }, (_, index) => `Sentence ${index + 1} has enough text to make this paragraph large.`).join(" ");
		const fetchLike = async (_url: string, init: any) => {
			bodies.push(JSON.parse(init.body));
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: `Fragmento ${bodies.length}.` } }] }),
			};
		};

		const result = await translateFinalAnswerToSpanish(longAnswer, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.ok(bodies.length > 1);
		assert.equal(result.spanishAnswer, Array.from({ length: bodies.length }, (_, index) => `Fragmento ${index + 1}.`).join(""));
	});

	it("allocates enough output tokens for longer Spanish translations", async () => {
		let body: any;
		const input = "x".repeat(1000);
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "traducido" } }] }),
			};
		};

		await translateFinalAnswerToSpanish(input, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(body.max_tokens, 750);
	});

	it("preserves un-fenced technical output blocks", async () => {
		let calls = 0;
		const fetchLike = async () => {
			calls += 1;
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "Párrafo traducido." } }] }),
			};
		};

		const answer = [
			"Paragraph to translate.",
			"",
			"$ npm test",
			"> pi-router-extension@0.1.0 test",
			"FAIL tests/final-answer.test.ts",
			"",
			'{ "error": "keep exact" }',
			"",
			"src/",
			"├── index.ts",
			"└── final-answer.ts",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(calls, 1);
		assert.equal(result.spanishAnswer, [
			"Párrafo traducido.",
			"",
			"$ npm test",
			"> pi-router-extension@0.1.0 test",
			"FAIL tests/final-answer.test.ts",
			"",
			'{ "error": "keep exact" }',
			"",
			"src/",
			"├── index.ts",
			"└── final-answer.ts",
		].join("\n"));
	});

	it("masks paths before final-answer translation and restores them afterward", async () => {
		let body: any;
		const path = "openspec/changes/add-roger-concurrent-interruption-listening/";
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "<SPANISH>Sin tocar §P0§.</SPANISH>" } }] }),
			};
		};

		const result = await translateFinalAnswerToSpanish(`Do not change ${path}.`, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.doesNotMatch(body.messages[0].content, /add-roger-concurrent-interruption-listening/);
		assert.match(body.messages[0].content, /§P0§/);
		assert.doesNotMatch(body.messages[0].content, /__PI_ROUTER_PROTECTED_0__/);
		assert.equal(result.spanishAnswer, `Sin tocar ${path}.`);
	});

	it("does not mask slash-separated prose as a path in final answers", async () => {
		let body: any;
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "<SPANISH>Puede estar installed/copied/symlinked en §P0§.</SPANISH>" } }] }),
			};
		};

		const result = await translateFinalAnswerToSpanish(
			"It can be installed/copied/symlinked in ~/.pi/agent/extensions/pi-router/.",
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
		);

		assert.match(body.messages[0].content, /installed\/copied\/symlinked/);
		assert.equal(result.spanishAnswer, "Puede estar installed/copied/symlinked en ~/.pi/agent/extensions/pi-router/.");
	});

	it("restores opaque protected placeholders from translated final answers", async () => {
		const path = "@~/.pi/agent/extensions/pi-router/README.md";
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "<SPANISH>El archivo §P0§ dice eso.</SPANISH>" } }] }),
		});

		const result = await translateFinalAnswerToSpanish(`The file ${path} says that.`, DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, `El archivo ${path} dice eso.`);
	});

	it("restores multiple opaque protected placeholders from final answers", async () => {
		const firstPath = ".pi/agent/extensions/pi-router/src/final-answer.ts";
		const secondPath = ".pi/agent/extensions/pi-router/src/index.ts";
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: [
				"Solo actualicé:",
				"",
				"- §P0§",
				"- §P1§",
			].join("\n") } }] }),
		});

		const result = await translateFinalAnswerToSpanish(
			`I only updated ${firstPath} and ${secondPath}.`,
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
		);

		assert.equal(result.spanishAnswer, [
			"Solo actualicé:",
			"",
			`- ${firstPath}`,
			`- ${secondPath}`,
		].join("\n"));
	});

	it("restores opaque protected placeholders in multiline final answers", async () => {
		const firstPath = ".pi/agent/extensions/pi-router/src/final-answer.ts";
		const secondPath = ".pi/agent/extensions/pi-router/tests/final-answer.test.ts";
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: [
				"Cambios hechos:",
				"- §P0§",
				"- §P1§",
			].join("\n") } }] }),
		});

		const result = await translateFinalAnswerToSpanish(
			`Changes made: ${firstPath} and ${secondPath}.`,
			DEFAULT_ROUTER_CONFIG.routerModel,
			fetchLike,
		);

		assert.equal(result.spanishAnswer, [
			"Cambios hechos:",
			`- ${firstPath}`,
			`- ${secondPath}`,
		].join("\n"));
	});

	it("preserves inline commands instead of leaking malformed placeholder suffixes", async () => {
		let body: any;
		const fetchLike = async (_url: string, init: any) => {
			body = JSON.parse(init.body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "- __PI_ROUTER_INLINE_0__ ❌ script faltante" } }] }),
			};
		};

		const result = await translateFinalAnswerToSpanish("- `npm run build` ❌ missing script", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.doesNotMatch(body.messages[0].content, /npm run build/);
		assert.match(body.messages[0].content, /__PI_ROUTER_INLINE_0__/);
		assert.equal(result.spanishAnswer, "- `npm run build` ❌ script faltante");
	});

	it("normalizes non-breaking-space byte artifacts in translated output", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: [
				"- Fibonacci:",
				"   <0xC2><0xA0>- fibonacciRecursive",
				"   \u00A0- fibonacciIterative",
			].join("\n") } }] }),
		});

		const result = await translateFinalAnswerToSpanish("- Fibonacci:\n   - fibonacciRecursive\n   - fibonacciIterative", DEFAULT_ROUTER_CONFIG.routerModel, fetchLike);

		assert.equal(result.spanishAnswer, [
			"- Fibonacci:",
			"   - fibonacciRecursive",
			"   - fibonacciIterative",
		].join("\n"));
	});

	it("falls back visibly when translation fails or times out", async () => {
		const result = await translateFinalAnswerToSpanish(
			"Done.",
			DEFAULT_ROUTER_CONFIG.routerModel,
			async () => { throw new Error("timeout"); },
		);

		assert.equal(result.spanishAnswer, "Done.");
		assert.equal(result.englishAnswer, "Done.");
		assert.equal(result.degradedReason, "final answer translation unavailable: timeout");
	});

	it("translates remote final answers through OpenAI Codex subscription auth", async () => {
		let fetched = false;
		let completedModel: any;
		let completedContext: any;
		const remoteModel = DEFAULT_ROUTER_CONFIG.routerModels.remote;
		const modelRegistry = {
			find: (provider: string, model: string) => ({ provider, id: model, api: "openai-codex-responses" }) as any,
			getApiKeyAndHeaders: async () => ({ ok: true as const, apiKey: "codex-oauth-token" }),
		};
		const complete = async (model: any, context: any) => {
			completedModel = model;
			completedContext = context;
			return {
				stopReason: "stop",
				content: [{ type: "text", text: "Listo. Los cambios están aplicados." }],
			} as any;
		};

		const result = await translateFinalAnswerToSpanish(
			"Done. The changes are applied.",
			remoteModel,
			async () => { fetched = true; throw new Error("fetch should not be used"); },
			{ modelRegistry, complete: complete as any },
		);

		assert.equal(fetched, false);
		assert.equal(completedModel.provider, "openai-codex");
		assert.equal(completedModel.id, "gpt-5.4-nano");
		assert.match(completedContext.messages[0].content[0].text, /BEGIN_PI_ROUTER_TRANSLATION_TEXT/);
		assert.equal(result.spanishAnswer, "Listo. Los cambios están aplicados.");
	});
});
