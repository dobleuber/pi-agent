import { it } from "node:test";
import assert from "node:assert/strict";
import { installPiRouter } from "../src/index.ts";

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => { resolve = done; });
	return { promise, resolve };
}

function runtime(overrides: Record<string, unknown> = {}) {
	const handlers = new Map<string, (event: any, ctx: any) => Promise<any>>();
	const appended: any[] = [];
	const notifications: string[] = [];
	const pi = {
		registerCommand() {},
		on(event: string, handler: any) { handlers.set(event, handler); },
		appendEntry(_type: string, data: any) { appended.push(data); },
		...overrides,
	};
	const ctx = {
		ui: { setStatus() {}, notify(message: string) { notifications.push(message); } },
		modelRegistry: { find: (_provider: string, model: string) => ({ provider: "openai-codex", id: model }) },
	};
	return { pi, ctx, handlers, appended, notifications };
}

const routed = (englishPrompt: string, sourceLanguage = "es") => ({
	englishPrompt, sourceLanguage, thinkingLevel: "medium" as const, translateFinalAnswer: sourceLanguage === "es",
});

it("warns and records fallbacks when model and thinking mutation APIs are unavailable", async () => {
	const h = runtime();
	installPiRouter(h.pi as any, {
		stateStore: { loadState: () => ({ state: "on" }), saveState() {} },
		routePrompt: async () => routed("Do it."),
		readCurrentModel: () => ({ provider: "openai-codex", model: "gpt-5.6-terra" }),
	});

	const result = await h.handlers.get("input")!({ text: "@thinking:low hazlo", source: "interactive" }, h.ctx);

	assert.equal(result.action, "transform");
	assert.equal(h.appended[0].details.effectiveModel, "openai-codex/gpt-5.6-terra");
	assert.equal(h.appended[0].details.policySelectedModel, "openai-codex/gpt-5.6-luna");
	assert.ok(h.appended[0].details.fallbackEvents.some((event: string) => /setModel API unavailable/.test(event)));
	assert.ok(h.appended[0].details.fallbackEvents.some((event: string) => /setThinkingLevel API unavailable/.test(event)));
	assert.equal(h.notifications.length, 2);
});

it("serializes final-answer translation so overlapping message_end events keep turn order", async () => {
	const firstTranslation = deferred<any>();
	const translated: string[] = [];
	const h = runtime({ setThinkingLevel() {} });
	installPiRouter(h.pi as any, {
		stateStore: { loadState: () => ({ state: "on" }), saveState() {} },
		routePrompt: async (prompt) => routed(prompt),
		translateFinalAnswer: async (answer) => {
			translated.push(answer);
			if (answer === "First answer") return firstTranslation.promise;
			return { englishAnswer: answer, spanishAnswer: "Segunda" };
		},
	});
	await h.handlers.get("input")!({ text: "primero", source: "interactive" }, h.ctx);
	await h.handlers.get("input")!({ text: "segundo", source: "interactive" }, h.ctx);

	const first = h.handlers.get("message_end")!({ message: { role: "assistant", content: "First answer" } }, h.ctx);
	const second = h.handlers.get("message_end")!({ message: { role: "assistant", content: "Second answer" } }, h.ctx);
	await Promise.resolve();
	assert.deepEqual(translated, ["First answer"]);
	firstTranslation.resolve({ englishAnswer: "First answer", spanishAnswer: "Primera" });
	assert.equal((await first).message.content, "Primera");
	assert.equal((await second).message.content, "Segunda");
	assert.deepEqual(translated, ["First answer", "Second answer"]);
	const completed = h.appended.filter((entry) => entry.phase === "complete");
	assert.deepEqual(completed.map((entry) => entry.details.englishAnswer), ["First answer", "Second answer"]);
});

it("serializes concurrent input routing through model and thinking application", async () => {
	const firstRoute = deferred<any>();
	let routeCalls = 0;
	let model = "gpt-5.6-terra";
	const switches: string[] = [];
	const h = runtime({
		async setModel(selected: any) { switches.push(selected.id); model = selected.id; },
		setThinkingLevel() {},
	});
	installPiRouter(h.pi as any, {
		stateStore: { loadState: () => ({ state: "on" }), saveState() {} },
		routePrompt: async (prompt) => {
			routeCalls += 1;
			return routeCalls === 1 ? firstRoute.promise : routed(prompt);
		},
		readCurrentModel: () => ({ provider: "openai-codex", model }),
	});

	const first = h.handlers.get("input")!({ text: "@thinking:max primero", source: "interactive" }, h.ctx);
	const second = h.handlers.get("input")!({ text: "@thinking:low segundo", source: "interactive" }, h.ctx);
	await Promise.resolve();
	assert.equal(routeCalls, 1);
	firstRoute.resolve(routed("first"));
	await first;
	await second;
	assert.equal(routeCalls, 2);
	assert.deepEqual(switches, ["gpt-5.6-sol", "gpt-5.6-luna"]);
	assert.deepEqual(h.appended.map((entry) => entry.details.turnId), ["router-turn-1", "router-turn-2"]);
});
