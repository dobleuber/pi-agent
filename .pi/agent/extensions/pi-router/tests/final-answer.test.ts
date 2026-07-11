import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import { translateFinalAnswerToSpanish } from "../src/final-answer.ts";

const HTTP_TEST_MODEL = { ...DEFAULT_ROUTER_CONFIG.routerModel, provider: "test-http", model: "test-translator", baseUrl: "http://127.0.0.1:11434/v1" };

function translationPayload(body: any): string {
	return body.messages[0].content.match(/---BEGIN_PI_ROUTER_TRANSLATION_TEXT---\n([\s\S]*?)\n---END_PI_ROUTER_TRANSLATION_TEXT---/)?.[1] ?? "";
}

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
			HTTP_TEST_MODEL,
			fetchLike,
		);

		assert.equal(body.model, "test-translator");
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
			HTTP_TEST_MODEL,
			fetchLike,
		);

		assert.equal(body.messages.length, 1);
		assert.equal(body.messages[0].role, "user");
		assert.match(body.messages[0].content, /Translate the text between ---BEGIN_PI_ROUTER_TRANSLATION_TEXT--- and ---END_PI_ROUTER_TRANSLATION_TEXT---/);
		assert.match(body.messages[0].content, /Use consistent prose in the target language/);
		assert.match(body.messages[0].content, /Do not mix in unrelated languages or scripts/);
		assert.match(body.messages[0].content, /If an English word has a natural translation in the target language/);
		assert.match(body.messages[0].content, /preserved placeholders, code, paths, commands, identifiers, product names, environment variables, and accepted technical terms/);
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

		await translateFinalAnswerToSpanish("Run `pytest tests/test_cli.py`.", HTTP_TEST_MODEL, fetchLike);

		assert.match(translatorPrompt, /Run __PI_ROUTER_INLINE_0__\./);
		assert.doesNotMatch(translatorPrompt, /pytest tests\/test_cli\.py/);
	});

	it("cleans chat-template artifacts from translated final answers", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "<SPANISH>Listo.</SPANISH><|im_end|>\n<|im_start|>assistant\nbasura" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, "Listo.");
	});

	it("falls back instead of showing echoed text payloads", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "<TEXT>Done.</TEXT>" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, "Done.");
		assert.equal(result.degradedReason, "final answer translation unavailable: echoed text payload");
	});

	it("extracts translated content when the model echoes translation delimiters", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "---BEGIN_PI_ROUTER_TRANSLATION_TEXT---\nListo.\n---END_PI_ROUTER_TRANSLATION_TEXT---" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, "Listo.");
		assert.equal(result.degradedReason, undefined);
	});

	it("falls back when echoed translation delimiters contain the original untranslated text", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "---BEGIN_PI_ROUTER_TRANSLATION_TEXT---\nDone.\n---END_PI_ROUTER_TRANSLATION_TEXT---" } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, "Done.");
		assert.equal(result.degradedReason, "final answer translation unavailable: untranslated output");
	});

	it("falls back instead of showing identical untranslated output", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "Done." } }] }),
		});

		const result = await translateFinalAnswerToSpanish("Done.", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, "Done.");
		assert.equal(result.degradedReason, "final answer translation unavailable: untranslated output");
	});

	it("bypasses translation when the complete final answer is already Spanish", async () => {
		let calls = 0;
		const fetchLike = async () => {
			calls += 1;
			throw new Error("translation should not be requested");
		};
		const answer = "Encontré la causa de las advertencias. Los cambios recientes no rompieron la traducción y la respuesta ya está en español.";

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike as any);

		assert.equal(calls, 0);
		assert.equal(result.englishAnswer, answer);
		assert.equal(result.spanishAnswer, answer);
		assert.equal(result.degradedReason, undefined);
	});

	it("repairs multiple residual-English fragments with one additional request", async () => {
		const calls: string[] = [];
		const fetchLike = async (_url: string, init: any) => {
			const prompt = JSON.parse(init.body).messages[0].content as string;
			calls.push(prompt);
			let content: string;
			if (prompt.includes("BEGIN_PI_ROUTER_REPAIR_TEXT")) {
				content = "---BEGIN_PI_ROUTER_REPAIR_TEXT---\nEsto ya está suficientemente maduro para un cambio de OpenSpec como:\n\nLos paquetes resuelven el abastecimiento, pero todavía necesitamos dar forma al cambio.\n---END_PI_ROUTER_REPAIR_TEXT---";
			} else if (prompt.includes("This is now mature enough")) {
				content = "This is now mature eenough for an OpenSpec change such as:";
			} else {
				content = "The packs solve sourcing, but we still need to shape the change.";
			}
			return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
		};
		const answer = "This is now mature enough for an OpenSpec change such as:\n\nThe packs solve sourcing, but we still need to shape the change.";

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike as any);

		assert.equal(calls.length, 3);
		assert.match(calls[2], /BEGIN_PI_ROUTER_REPAIR_TEXT/);
		assert.equal(result.spanishAnswer, "Esto ya está suficientemente maduro para un cambio de OpenSpec como:\n\nLos paquetes resuelven el abastecimiento, pero todavía necesitamos dar forma al cambio.");
		assert.equal(result.degradedReason, undefined);
	});

	it("does not add a repair request when the initial translations contain no residual English", async () => {
		let calls = 0;
		const fetchLike = async (_url: string, init: any) => {
			calls += 1;
			const prompt = JSON.parse(init.body).messages[0].content as string;
			const content = prompt.includes("The first section is ready")
				? "La primera sección está lista."
				: "La segunda sección también está lista.";
			return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
		};
		const answer = "The first section is ready.\n\nThe second section is also ready.";

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike as any);

		assert.equal(calls, 2);
		assert.doesNotMatch(result.spanishAnswer, /\bThe\b/);
		assert.equal(result.degradedReason, undefined);
	});

	it("returns coherent original English when the single repair pass still contains residual English", async () => {
		let calls = 0;
		const fetchLike = async (_url: string, init: any) => {
			calls += 1;
			const prompt = JSON.parse(init.body).messages[0].content as string;
			const content = prompt.includes("BEGIN_PI_ROUTER_REPAIR_TEXT")
				? "This is still not translated into Spanish."
				: "This is now mature eenough for an OpenSpec change such as:";
			return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
		};
		const answer = "This is now mature enough for an OpenSpec change such as:";

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike as any);

		assert.equal(calls, 2);
		assert.equal(result.spanishAnswer, answer);
		assert.match(result.degradedReason ?? "", /residual English after repair/);
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

		await translateFinalAnswerToSpanish("Done. Literal </TEXT> marker.", HTTP_TEST_MODEL, fetchLike);

		assert.match(body.messages[0].content, /BEGIN_PI_ROUTER_TRANSLATION_TEXT/);
		assert.match(body.messages[0].content, /Done\. Literal <\/TEXT> marker\./);
		assert.doesNotMatch(body.messages[0].content, /<TEXT>Done\. Literal <\/TEXT> marker\.<\/TEXT>/);
		assert.match(body.messages[0].content, /END_PI_ROUTER_TRANSLATION_TEXT/);
	});

	it("preserves mixed markdown structures in translated final answers", async () => {
		const bodies: any[] = [];
		const translations = [
			"# Revisión del HUD",
			"> Mantén el juego legible.",
			[
				"- Usa __PI_ROUTER_INLINE_0__",
				"- Ejecuta __PI_ROUTER_INLINE_1__",
			].join("\n"),
			[
				"1. Comprime la cabina",
				"2. Mueve el calor cerca de la retícula",
			].join("\n"),
			"Hecho en __PI_ROUTER_INLINE_2__.",
		];
		const fetchLike = async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			bodies.push(body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: translations[bodies.length - 1] } }] }),
			};
		};

		const answer = [
			"# HUD Review",
			"",
			"> Keep the game readable.",
			"",
			"- Use `scripts/ui/hud_controller.gd`",
			"- Run `godot --headless --check-only --path .`",
			"",
			"1. Compress the cockpit",
			"2. Move heat near the reticle",
			"",
			"| Layer | Purpose |",
			"|---|---|",
			"| Combat | Aim |",
			"",
			"```text",
			"┌────────────┐",
			"│ GAME VIEW  │",
			"└────────────┘",
			"```",
			"",
			"Done in `scenes/ui/hud.tscn`.",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(bodies.length, 5);
		assert.match(translationPayload(bodies[0]), /^# HUD Review$/);
		assert.match(translationPayload(bodies[1]), /^> Keep the game readable\.$/);
		assert.match(translationPayload(bodies[2]), /__PI_ROUTER_INLINE_0__/);
		assert.match(translationPayload(bodies[2]), /__PI_ROUTER_INLINE_1__/);
		assert.doesNotMatch(bodies.map(translationPayload).join("\n"), /GAME VIEW|scenes\/ui\/hud\.tscn|godot --headless/);
		assert.equal(result.spanishAnswer, [
			"# Revisión del HUD",
			"",
			"> Mantén el juego legible.",
			"",
			"- Usa `scripts/ui/hud_controller.gd`",
			"- Ejecuta `godot --headless --check-only --path .`",
			"",
			"1. Comprime la cabina",
			"2. Mueve el calor cerca de la retícula",
			"",
			"| Layer | Purpose |",
			"|---|---|",
			"| Combat | Aim |",
			"",
			"```text",
			"┌────────────┐",
			"│ GAME VIEW  │",
			"└────────────┘",
			"```",
			"",
			"Hecho en `scenes/ui/hud.tscn`.",
		].join("\n"));
	});

	it("preserves blank-line boundaries around fenced table diagrams", async () => {
		const translations = ["Aquí está la tabla:", "Siguiente párrafo."];
		let call = 0;
		const fetchLike = async () => {
			const content = translations[call];
			call += 1;
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content } }] }),
			};
		};

		const answer = [
			"Here is the table:",
			"",
			"```text",
			"   ┌────────────────────────────────────────────────────┐",
			"   │                    VISTA PRINCIPAL                │",
			"   │                                                    │",
			"   │              MUNICIÓN 28  +  CALOR 34%            │",
			"   │                                                    │",
			"   ├────────────────────────────────────────────────────┤",
			"   │ AMENAZA IZQUIERDA  RADAR   AMENAZA DERECHA       │",
			"   │ MOVIMIENTO 20/50 ━━━━━╸────  RIFLE LISTO  PIERNAS OK        │",
			"   └────────────────────────────────────────────────────┘",
			"```",
			"",
			"Next paragraph.",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, [
			"Aquí está la tabla:",
			"",
			"```text",
			"   ┌────────────────────────────────────────────────────┐",
			"   │                    VISTA PRINCIPAL                │",
			"   │                                                    │",
			"   │              MUNICIÓN 28  +  CALOR 34%            │",
			"   │                                                    │",
			"   ├────────────────────────────────────────────────────┤",
			"   │ AMENAZA IZQUIERDA  RADAR   AMENAZA DERECHA       │",
			"   │ MOVIMIENTO 20/50 ━━━━━╸────  RIFLE LISTO  PIERNAS OK        │",
			"   └────────────────────────────────────────────────────┘",
			"```",
			"",
			"Siguiente párrafo.",
		].join("\n"));
	});

	it("preserves unfenced ASCII tables without translating them", async () => {
		const bodies: any[] = [];
		const translations = ["Antes de la tabla.", "Después de la tabla."];
		const fetchLike = async (_url: string, init: any) => {
			bodies.push(JSON.parse(init.body));
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: translations[bodies.length - 1] } }] }),
			};
		};

		const asciiTable = [
			"   ┌────────────────────────────────────────────────────┐",
			"   │                    MAIN VIEW                      │",
			"   │                                                    │",
			"   │              AMMO 28  +  HEAT 34%                 │",
			"   │                                                    │",
			"   ├────────────────────────────────────────────────────┤",
			"   │ LEFT THREAT      RADAR      RIGHT THREAT          │",
			"   │ MOVE 20/50 ━━━━━╸────  RIFLE READY  LEGS OK       │",
			"   └────────────────────────────────────────────────────┘",
		].join("\n");
		const answer = ["Before the table.", "", asciiTable, "", "After the table."].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(bodies.length, 2);
		assert.doesNotMatch(bodies.map(translationPayload).join("\n"), /MAIN VIEW|AMMO|LEFT THREAT|RIFLE READY/);
		assert.equal(result.spanishAnswer, ["Antes de la tabla.", "", asciiTable, "", "Después de la tabla."].join("\n"));
	});

	it("translates prose chunks while preserving fenced code blocks unchanged", async () => {
		const bodies: any[] = [];
		const fetchLike = async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			bodies.push(body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: bodies.length === 1 ? "Primer párrafo." : "Segundo párrafo." } }] }),
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

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(bodies.length, 2);
		assert.doesNotMatch(translationPayload(bodies[0]), /keep me exact|PI_ROUTER_PRESERVED_BLOCK/);
		assert.doesNotMatch(translationPayload(bodies[1]), /keep me exact|PI_ROUTER_PRESERVED_BLOCK/);
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

	it("translates prose around fenced code blocks without sending the blocks to the model", async () => {
		const bodies: any[] = [];
		const translations = [
			"Correcto: el código principal de Roger no está en este repositorio __PI_ROUTER_INLINE_0__.",
			"Parece vivir en tu repositorio separado:",
			"Remoto:",
			"Ruta del paquete principal Roger:",
			"Los ejemplos allí incluyen:",
			"Este repositorio (__PI_ROUTER_INLINE_1__) solo tiene manejo de integración relacionado con Roger.",
		];
		const fetchLike = async (_url: string, init: any) => {
			const body = JSON.parse(init.body);
			bodies.push(body);
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: translations[bodies.length - 1] } }] }),
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

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(bodies.length, 6);
		for (const body of bodies) {
			assert.doesNotMatch(translationPayload(body), /home\/dobleuber\/Projects|github\.com|src\/roger|PI_ROUTER_PRESERVED_BLOCK/);
		}
		assert.match(result.spanishAnswer, /^Correcto: el código principal de Roger/);
		assert.match(result.spanishAnswer, /Parece vivir en tu repositorio separado:/);
		assert.match(result.spanishAnswer, /```txt\n\/home\/dobleuber\/Projects\/personal\/pi-extensions\/\n```/);
		assert.match(result.spanishAnswer, /Los ejemplos allí incluyen:/);
		assert.doesNotMatch(result.degradedReason ?? "", /untranslated output/);
	});

	it("does not let translated prose corrupt multiple fenced diagram blocks", async () => {
		const bodies: any[] = [];
		const fetchLike = async (_url: string, init: any) => {
			bodies.push(JSON.parse(init.body));
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: bodies.length === 1 ? "Sección A traducida." : "Sección B traducida." } }] }),
			};
		};

		const answer = [
			"Section A.",
			"",
			"```text",
			"DIAGRAM A",
			"```",
			"",
			"Section B.",
			"",
			"```text",
			"DIAGRAM B",
			"```",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(bodies.length, 2);
		assert.doesNotMatch(translationPayload(bodies[0]), /DIAGRAM A|DIAGRAM B|PI_ROUTER_PRESERVED_BLOCK/);
		assert.doesNotMatch(translationPayload(bodies[1]), /DIAGRAM A|DIAGRAM B|PI_ROUTER_PRESERVED_BLOCK/);
		assert.equal(result.spanishAnswer, [
			"Sección A traducida.",
			"",
			"```text",
			"DIAGRAM A",
			"```",
			"",
			"Sección B traducida.",
			"",
			"```text",
			"DIAGRAM B",
			"```",
		].join("\n"));
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

		const result = await translateFinalAnswerToSpanish("First paragraph.\n\nSecond paragraph.", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, "Primer párrafo.\n\nSecond paragraph.");
		assert.match(result.degradedReason!, /chunk 2/);
		assert.match(result.degradedReason!, /empty response/);
	});

	it("splits long contextual fenced-block answers into safe prose chunks", async () => {
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

		const result = await translateFinalAnswerToSpanish(longAnswer, HTTP_TEST_MODEL, fetchLike);

		assert.ok(calls.length >= 2, "expected multiple prose chunks around the fenced block");
		assert.ok(calls.every((chunk) => chunk.length <= 1200), "expected fenced-block splitting to avoid oversized chunks");
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

		const result = await translateFinalAnswerToSpanish(longAnswer, HTTP_TEST_MODEL, fetchLike);

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

		await translateFinalAnswerToSpanish(input, HTTP_TEST_MODEL, fetchLike);

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

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

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

		const result = await translateFinalAnswerToSpanish(`Do not change ${path}.`, HTTP_TEST_MODEL, fetchLike);

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
			HTTP_TEST_MODEL,
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

		const result = await translateFinalAnswerToSpanish(`The file ${path} says that.`, HTTP_TEST_MODEL, fetchLike);

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
			HTTP_TEST_MODEL,
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
			HTTP_TEST_MODEL,
			fetchLike,
		);

		assert.equal(result.spanishAnswer, [
			"Cambios hechos:",
			`- ${firstPath}`,
			`- ${secondPath}`,
		].join("\n"));
	});

	it("falls back when translated chunks return the wrong inline placeholders", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: [
				"Puntos de extensión relevantes:",
				"- __PI_ROUTER_INLINE_0__",
				"- __PI_ROUTER_INLINE_1__",
				"- __PI_ROUTER_INLINE_2__",
				"",
				"Candidatos de capacidad:",
				"- __PI_ROUTER_INLINE_0__",
				"- __PI_ROUTER_INLINE_0__",
				"- __PI_ROUTER_INLINE_0__",
			].join("\n") } }] }),
		});

		const answer = [
			"Relevant extension points:",
			"- `before_agent_start`",
			"- `input`",
			"- `tool_call`",
			"",
			"Capability candidates:",
			"- `agent-policy-guardrails`",
			"- `runtime-policy-engine`",
			"- `pi-guardrail-policies`",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, answer);
		assert.match(result.degradedReason ?? "", /placeholder mismatch/);
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

		const result = await translateFinalAnswerToSpanish("- `npm run build` ❌ missing script", HTTP_TEST_MODEL, fetchLike);

		assert.doesNotMatch(body.messages[0].content, /npm run build/);
		assert.match(body.messages[0].content, /__PI_ROUTER_INLINE_0__/);
		assert.equal(result.spanishAnswer, "- `npm run build` ❌ script faltante");
	});

	it("repairs inline placeholders with malformed numeric suffixes", async () => {
		for (const suffix of ["0__", "3__"]) {
			const fetchLike = async () => ({
				ok: true,
				json: async () => ({ choices: [{ message: { content: `Véase __PI_ROUTER_INLINE_0__${suffix}.` } }] }),
			});

			const result = await translateFinalAnswerToSpanish("See `.pi/agent/test_file:33`.", HTTP_TEST_MODEL, fetchLike);

			assert.equal(result.spanishAnswer, "Véase `.pi/agent/test_file:33`.");
			assert.doesNotMatch(result.spanishAnswer, /\d+__/);
		}
	});

	it("restores double-digit inline placeholders without matching shorter placeholder prefixes", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: [
				"Resultado:",
				"__PI_ROUTER_INLINE_0__ __PI_ROUTER_INLINE_1__ __PI_ROUTER_INLINE_2__ __PI_ROUTER_INLINE_3__ __PI_ROUTER_INLINE_4__",
				"__PI_ROUTER_INLINE_5__ __PI_ROUTER_INLINE_6__ __PI_ROUTER_INLINE_7__ __PI_ROUTER_INLINE_8__ __PI_ROUTER_INLINE_9__ __PI_ROUTER_INLINE_10__.",
			].join("\n") } }] }),
		});
		const answer = [
			"Final check:",
			"`zero` `one` `two` `three` `four` `five` `six` `seven` `eight` `runtime-policy-engine` and `agent-observability-evaluation`.",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, [
			"Resultado:",
			"`zero` `one` `two` `three` `four`",
			"`five` `six` `seven` `eight` `runtime-policy-engine` `agent-observability-evaluation`.",
		].join("\n"));
	});

	it("repairs protected path placeholders with malformed suffixes outside inline code", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "Véase §P0§3__." } }] }),
		});

		const result = await translateFinalAnswerToSpanish("See .pi/agent/test_file:33.", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, "Véase .pi/agent/test_file:33.");
		assert.doesNotMatch(result.spanishAnswer, /3__/);
	});

	it("preserves literal protected-placeholder examples inside inline code", async () => {
		const fetchLike = async () => ({
			ok: true,
			json: async () => ({ choices: [{ message: { content: "Archivo: §P0§. Ejemplo literal: __PI_ROUTER_INLINE_0__." } }] }),
		});

		const result = await translateFinalAnswerToSpanish(
			"File: .pi/agent/extensions/pi-router/src/final-answer.ts. Literal example: `§P0§3__`.",
			HTTP_TEST_MODEL,
			fetchLike,
		);

		assert.equal(result.spanishAnswer, "Archivo: .pi/agent/extensions/pi-router/src/final-answer.ts. Ejemplo literal: `§P0§3__`.");
	});

	it("preserves path-only bullet chunks without translating or warning", async () => {
		const bodies: any[] = [];
		const fetchLike = async (_url: string, init: any) => {
			bodies.push(JSON.parse(init.body));
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: "Hecho." } }] }),
			};
		};
		const answer = [
			"Done.",
			"",
			"- `.pi/agent/extensions/pi-router/src/final-answer.ts:57-74`",
			"- `.pi/agent/extensions/pi-router/src/index.ts:231-232`",
		].join("\n");

		const result = await translateFinalAnswerToSpanish(answer, HTTP_TEST_MODEL, fetchLike);

		assert.equal(bodies.length, 1);
		assert.equal(result.degradedReason, undefined);
		assert.equal(result.spanishAnswer, [
			"Hecho.",
			"",
			"- `.pi/agent/extensions/pi-router/src/final-answer.ts:57-74`",
			"- `.pi/agent/extensions/pi-router/src/index.ts:231-232`",
		].join("\n"));
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

		const result = await translateFinalAnswerToSpanish("- Fibonacci:\n   - fibonacciRecursive\n   - fibonacciIterative", HTTP_TEST_MODEL, fetchLike);

		assert.equal(result.spanishAnswer, [
			"- Fibonacci:",
			"   - fibonacciRecursive",
			"   - fibonacciIterative",
		].join("\n"));
	});

	it("falls back visibly when translation fails or times out", async () => {
		const result = await translateFinalAnswerToSpanish(
			"Done.",
			HTTP_TEST_MODEL,
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
		const remoteModel = DEFAULT_ROUTER_CONFIG.routerModel;
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
		assert.equal(completedModel.id, "gpt-5.4-mini");
		assert.match(completedContext.messages[0].content[0].text, /BEGIN_PI_ROUTER_TRANSLATION_TEXT/);
		assert.equal(result.spanishAnswer, "Listo. Los cambios están aplicados.");
	});
});
