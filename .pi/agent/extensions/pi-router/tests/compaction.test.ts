import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compactWithSessionIdentity } from "../src/compaction.ts";

describe("router compaction adapter", () => {
	it("preserves native compaction while forwarding session identity to every summary stream", async () => {
		const preparation = { messagesToSummarize: ["history"], turnPrefixMessages: ["prefix"] };
		const signal = new AbortController().signal;
		const model = { provider: "openai-codex", id: "gpt-5.6-luna" };
		const auth = { ok: true as const, apiKey: "token", headers: { authorization: "Bearer token" }, env: { TEST_ENV: "1" } };
		const streamOptions: any[] = [];
		const nativeResult = { summary: "summary", firstKeptEntryId: "entry-2", tokensBefore: 42, details: { readFiles: [], modifiedFiles: [] } };
		let compactArguments: any[] | undefined;
		const stream = (_model: any, _context: any, options: any) => {
			streamOptions.push(options);
			return { result: async () => ({}) } as any;
		};
		const compact = async (...args: any[]) => {
			compactArguments = args;
			const streamFn = args[7];
			streamFn(model, { messages: [] }, { maxTokens: 100, reasoning: "max" });
			streamFn(model, { messages: [] }, { maxTokens: 50 });
			return nativeResult;
		};
		const ctx = {
			model,
			modelRegistry: { getApiKeyAndHeaders: async () => auth },
			sessionManager: { getSessionId: () => "session-123" },
		};

		const result = await compactWithSessionIdentity(
			{ preparation, customInstructions: "focus", signal } as any,
			ctx as any,
			"max",
			{ compact: compact as any, stream: stream as any },
		);

		assert.equal(result, nativeResult);
		assert.equal(compactArguments?.[0], preparation);
		assert.equal(compactArguments?.[1], model);
		assert.equal(compactArguments?.[2], "token");
		assert.deepEqual(compactArguments?.[3], auth.headers);
		assert.equal(compactArguments?.[4], "focus");
		assert.equal(compactArguments?.[5], signal);
		assert.equal(compactArguments?.[6], "max");
		assert.deepEqual(compactArguments?.[8], auth.env);
		assert.deepEqual(streamOptions, [
			{ maxTokens: 100, reasoning: "max", sessionId: "session-123" },
			{ maxTokens: 50, sessionId: "session-123" },
		]);
	});

	it("forwards session identity through both real native split-turn summary calls", async () => {
		const streamOptions: any[] = [];
		let summaryNumber = 0;
		const stream = (_model: any, _context: any, options: any) => {
			streamOptions.push(options);
			const message = {
				role: "assistant", content: [{ type: "text", text: `summary-${++summaryNumber}` }],
				api: "openai-codex-responses", provider: "openai-codex", model: "gpt-5.6-luna",
				usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
				stopReason: "stop", timestamp: Date.now(),
			};
			return { result: async () => message } as any;
		};
		const userMessage = (text: string) => ({ role: "user", content: [{ type: "text", text }], timestamp: Date.now() });
		const preparation = {
			firstKeptEntryId: "entry-2", messagesToSummarize: [userMessage("history")],
			turnPrefixMessages: [userMessage("prefix")], isSplitTurn: true, tokensBefore: 100,
			previousSummary: undefined, fileOps: { read: new Set<string>(), written: new Set<string>(), edited: new Set<string>() },
			settings: { enabled: true, reserveTokens: 1000, keepRecentTokens: 100 },
		};
		const ctx = {
			model: { provider: "openai-codex", id: "gpt-5.6-luna", reasoning: true, maxTokens: 128000 },
			modelRegistry: { getApiKeyAndHeaders: async () => ({ ok: true as const, apiKey: "token" }) },
			sessionManager: { getSessionId: () => "session-split" },
		};

		const result = await compactWithSessionIdentity(
			{ preparation } as any, ctx as any, "max", { stream: stream as any },
		);

		assert.match(result.summary, /summary-1/);
		assert.match(result.summary, /summary-2/);
		assert.equal(streamOptions.length, 2);
		assert.ok(streamOptions.every((options) => options.sessionId === "session-split"));
	});

	it("rejects compaction when model, session identity, or auth is unavailable", async () => {
		const event = { preparation: {}, signal: new AbortController().signal } as any;
		const base = { modelRegistry: { getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "token" }) }, sessionManager: { getSessionId: () => "session-123" } };
		await assert.rejects(() => compactWithSessionIdentity(event, { ...base, model: undefined } as any), /model unavailable/);
		await assert.rejects(() => compactWithSessionIdentity(event, { ...base, model: { id: "luna" }, sessionManager: { getSessionId: () => undefined } } as any), /session ID unavailable/);
		await assert.rejects(() => compactWithSessionIdentity(event, { ...base, model: { id: "luna" }, modelRegistry: { getApiKeyAndHeaders: async () => ({ ok: false, error: "expired" }) } } as any), /expired/);
	});
});
