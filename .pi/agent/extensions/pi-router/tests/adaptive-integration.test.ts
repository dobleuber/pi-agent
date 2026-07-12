import { it } from "node:test";
import assert from "node:assert/strict";
import { installPiRouter } from "../src/index.ts";

function harness(options: any = {}) {
	const handlers = new Map<string, any>(); const commands = new Map<string, any>(); const appended: any[] = []; const notices: string[] = []; const calls: any[] = [];
	const pi: any = { registerCommand(n: string, c: any) { commands.set(n, c); }, on(n: string, h: any) { handlers.set(n, h); },
		setModel: options.setModel ?? ((m: any) => calls.push(["model", m.id])), setThinkingLevel(l: string) { calls.push(["thinking", l]); },
		getThinkingLevel: () => options.effectiveLevel ?? [...calls].reverse().find((c: any) => c[0] === "thinking")?.[1], getActiveTools: () => options.tools ?? [], appendEntry(_t: string, d: any) { appended.push(d); } };
	installPiRouter(pi, { stateStore: { loadState: () => ({ state: "on" }), saveState() {} }, routePrompt: options.routePrompt ?? (async () => options.result ?? ({ englishPrompt: "Do it", sourceLanguage: "en", thinkingLevel: "medium", translateFinalAnswer: false, taskComplexity: "routine" })), translateFinalAnswer: async (a: string) => ({ englishAnswer: a, spanishAnswer: "Traducido" }), ...(options.readCurrentModel ? { readCurrentModel: options.readCurrentModel } : {}) });
	const ctx: any = { model: options.model ?? { provider: "openai-codex", id: "gpt-5.6-sol" }, modelRegistry: { find: (_p: string, id: string) => options.missing ? undefined : ({ provider: "openai-codex", id }) }, ui: { notify(m: string) { notices.push(m); }, setStatus() {} } };
	return { handlers, commands, appended, notices, calls, ctx };
}

it("applies managed model before effort and records effective diagnostics", async () => {
	const h = harness({ model: { provider: "openai-codex", id: "gpt-5.6-luna" }, effectiveLevel: "high", result: { englishPrompt: "Review", sourceLanguage: "en", thinkingLevel: "low", translateFinalAnswer: false, taskComplexity: "difficult" } });
	await h.handlers.get("input")({ text: "deep security review", source: "interactive" }, h.ctx);
	assert.deepEqual(h.calls, [["model", "gpt-5.6-sol"], ["thinking", "xhigh"]]);
	assert.equal(h.appended[0].details.thinkingWasClamped, true); assert.equal(h.appended[0].details.effectiveThinkingLevel, "high");
	assert.match(h.notices.join(" "), /adjusted thinking xhigh to high/);
});

it("reads back the mutable effective model after setModel and reports a visible mismatch before thinking", async () => {
	let reads = 0;
	const h = harness({
		model: { provider: "openai-codex", id: "gpt-5.6-luna" },
		readCurrentModel: () => (++reads === 1
			? { provider: "openai-codex", model: "gpt-5.6-luna" }
			: { provider: "openai-codex", model: "gpt-5.6-terra" }),
		result: { englishPrompt: "Review", sourceLanguage: "en", thinkingLevel: "low", translateFinalAnswer: false, taskComplexity: "difficult" },
	});
	await h.handlers.get("input")({ text: "deep security review", source: "interactive" }, h.ctx);
	assert.equal(h.appended[0].details.effectiveModel, "openai-codex/gpt-5.6-terra");
	assert.match(h.appended[0].details.fallbackEvents.join(" "), /requested openai-codex\/gpt-5.6-sol.*effective openai-codex\/gpt-5.6-terra/);
	assert.deepEqual(h.calls, [["model", "gpt-5.6-sol"], ["thinking", "xhigh"]]);
});

it("preserves external models and separates parallel-agentic mode", async () => {
	const h = harness({ model: { provider: "anthropic", id: "claude" }, tools: ["subagent"], result: { englishPrompt: "Review", sourceLanguage: "en", thinkingLevel: "high", translateFinalAnswer: false, parallelizable: true } });
	await h.handlers.get("input")({ text: "independently review modules", source: "interactive" }, h.ctx);
	assert.equal(h.calls.some(c => c[0] === "model"), false); assert.equal(h.appended[0].details.modelRouting, "preserved-external");
	assert.equal(h.appended[0].details.executionMode, "parallel-agentic");
});

it("persists automatic thinking and translation normalizations in audit details", async () => {
	const h = harness({ result: { englishPrompt: "Do it", sourceLanguage: "unknown", thinkingLevel: "max", translateFinalAnswer: true, translationNormalization: "unknown source language; conservative default true" } });
	await h.handlers.get("input")({ text: "routine clear coding update", source: "interactive" }, h.ctx);
	assert.equal(h.appended[0].details.thinkingNormalization, "automatic max capped to xhigh");
	assert.equal(h.appended[0].details.translationDecision, "unknown source language; conservative default true");
});

it("keeps model profile on missing target and makes fallback visible", async () => {
	const h = harness({ missing: true });
	await h.handlers.get("input")({ text: "update clear README", source: "interactive" }, h.ctx);
	assert.match(h.appended[0].details.fallbackEvents.join(" "), /model fallback/);
});

it("forces Spanish translation and waits through intermediate assistant phases", async () => {
	const h = harness({ result: { englishPrompt: "Answer with variety", sourceLanguage: "mixed", thinkingLevel: "medium", translateFinalAnswer: false } });
	await h.handlers.get("input")({ text: "respuesta con mucha variedad", source: "interactive" }, h.ctx);
	assert.equal(await h.handlers.get("message_end")({ message: { role: "assistant", phase: "commentary", content: [{ type: "text", text: "Working" }], timestamp: 1 } }, h.ctx), undefined);
	const out = await h.handlers.get("message_end")({ message: { role: "assistant", phase: "final_answer", content: [{ type: "text", text: "Done" }], timestamp: 2, id: "a" } }, h.ctx);
	assert.equal(out.message.phase, "final_answer"); assert.equal(out.message.id, "a"); assert.equal(out.message.content[0].text, "Traducido");
	assert.equal(h.appended.filter(e => e.phase === "complete").length, 1);
});

it("leaves phase-less empty events pending but completes explicit empty finals", async () => {
	const h = harness(); await h.handlers.get("input")({ text: "do it", source: "interactive" }, h.ctx);
	await h.handlers.get("message_end")({ message: { role: "assistant", content: "" } }, h.ctx);
	assert.equal(h.appended.filter(e => e.phase === "complete").length, 0);
	const original = { role: "assistant", phase: "final_answer", content: "", timestamp: 42, providerData: { stop: "end" } };
	const replacement = await h.handlers.get("message_end")({ message: original }, h.ctx);
	assert.match(h.appended.at(-1).details.fallbackEvents.join(" "), /empty answer/);
	assert.match(replacement.message.content, /Pi router: final answer was empty/);
	assert.equal(replacement.message.phase, "final_answer"); assert.equal(replacement.message.timestamp, 42);
	assert.deepEqual(replacement.message.providerData, { stop: "end" });
});

it("replaces unsupported explicit finals visibly while preserving non-text content", async () => {
	const h = harness(); await h.handlers.get("input")({ text: "do it", source: "interactive" }, h.ctx);
	const result = await h.handlers.get("message_end")({ message: { role: "assistant", phase: "final_answer", timestamp: 7, content: [{ type: "image", data: "x" }] } }, h.ctx);
	assert.deepEqual(result.message.content[0], { type: "image", data: "x" });
	assert.match(result.message.content[1].text, /unsupported content/);
	assert.equal(result.message.timestamp, 7);
});

it("blocks invalid controls and strips valid controls before dispatch", async () => {
	let routed = ""; const h = harness({ routePrompt: async (prompt: string) => { routed = prompt; return { englishPrompt: prompt, sourceLanguage: "en", thinkingLevel: "medium", translateFinalAnswer: false }; } });
	const invalid = await h.handlers.get("input")({ text: "@thinking:turbo do it", source: "interactive" }, h.ctx);
	assert.deepEqual(invalid, { action: "handled" }); assert.match(h.notices.at(-1)!, /Invalid @thinking/);
	await h.handlers.get("input")({ text: "@thinking:high do it", source: "interactive" }, h.ctx);
	assert.equal(routed, "do it"); assert.equal(h.appended.at(-1).details.overrideSource, "syntax");
});
