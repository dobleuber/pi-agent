import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import piRouterExtension, { installPiRouter } from "../src/index.ts";

const DEFAULT_TEST_CONFIG = DEFAULT_ROUTER_CONFIG;

describe("pi-router extension entrypoint", () => {
	it("registers a router status command and session status indicator", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<void> | void>>();
		const statuses: Array<[string, string | undefined]> = [];
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) {
				commands.set(name, command);
			},
			on(event: string, handler: (event: any, ctx: any) => Promise<void> | void) {
				handlers.set(event, [...(handlers.get(event) ?? []), handler]);
			},
		};

		installPiRouter(pi as any, { stateStore: { loadState: () => undefined, saveState() {} } });

		assert.ok(commands.has("router"));
		assert.equal(handlers.get("session_start")?.length, 1);
		assert.equal(handlers.get("input")?.length, 1);

		const ctx = {
			ui: {
				notify(message: string) {
					notifications.push(message);
				},
				setStatus(name: string, value: string | undefined) {
					statuses.push([name, value]);
				},
			},
		};
		await handlers.get("session_start")![0]({}, ctx);
		const inputResult = await handlers.get("input")![0]({ text: "/model", source: "interactive" }, ctx);
		await commands.get("router")!.handler("", ctx);

		assert.deepEqual(inputResult, { action: "continue" });
		assert.deepEqual(statuses, [["pi-router", "router:off"]]);
		assert.deepEqual(notifications, [
			"router:off local:on routerModel:llama-cpp/gemma4 workModel:unknown",
		]);
	});

	it("translates final assistant messages and updates latest router details", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const appended: Array<[string, any]> = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry(type: string, data: any) { appended.push([type, data]); },
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Improve the router.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer: string) => ({
				englishAnswer: answer,
				spanishAnswer: "Listo.",
			}),
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		const result = await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }, ctx);

		assert.deepEqual(result.message.content, [{ type: "text", text: "Listo." }]);
		assert.equal(appended.at(-1)![0], "pi-router-details");
		assert.equal(appended.at(-1)![1].phase, "complete");
		assert.equal(appended.at(-1)![1].details.englishAnswer, "Done.");
		assert.equal(appended.at(-1)![1].details.spanishAnswer, "Listo.");
	});

	it("does not translate final assistant messages when router says the answer should stay English", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		let translateCalls = 0;
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry() {},
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Check the router.",
				sourceLanguage: "en",
				thinkingLevel: "low",
				translateFinalAnswer: false,
			}),
			translateFinalAnswer: async (answer: string) => {
				translateCalls += 1;
				return { englishAnswer: answer, spanishAnswer: "Traducido." };
			},
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "Check the router.", source: "interactive" }, ctx);

		const result = await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }, ctx);

		assert.equal(translateCalls, 0);
		assert.equal(result, undefined);
	});

	it("clears routed turn state after one assistant message", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		let translateCalls = 0;
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry() {},
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Improve the router.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer: string) => {
				translateCalls += 1;
				return { englishAnswer: answer, spanishAnswer: `Traducido ${translateCalls}.` };
			},
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		const first = await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }, ctx);
		const second = await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Unrelated later message." }] } }, ctx);

		assert.equal(translateCalls, 1);
		assert.deepEqual(first.message.content, [{ type: "text", text: "Traducido 1." }]);
		assert.equal(second, undefined);
	});

	it("does not consume a pending routed turn on assistant tool-call messages", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const appended: Array<[string, any]> = [];
		let translatedInput = "";
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry(type: string, data: any) { appended.push([type, data]); },
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Do we have an OpenAI Codex smoke script?",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer: string) => {
				translatedInput = answer;
				return { englishAnswer: answer, spanishAnswer: "No tenemos ese script." };
			},
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "Tenemos un script smoke de OpenAI Codex?", source: "interactive" }, ctx);

		const toolCallResult = await handlers.get("message_end")![0]({
			message: { role: "assistant", content: [{ type: "toolCall", name: "bash", arguments: {} }] },
		}, ctx);
		const finalResult = await handlers.get("message_end")![0]({
			message: { role: "assistant", content: [{ type: "text", text: "We do not have that script." }] },
		}, ctx);

		assert.equal(toolCallResult, undefined);
		assert.equal(translatedInput, "We do not have that script.");
		assert.deepEqual(finalResult.message.content, [{ type: "text", text: "No tenemos ese script." }]);
		assert.equal(appended.at(-1)![1].phase, "complete");
	});

	it("does not consume a pending routed turn on assistant text plus tool-call messages", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		let translatedInput = "";
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry() {},
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Review the logs.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer: string) => {
				translatedInput = answer;
				return { englishAnswer: answer, spanishAnswer: "Ese fue el resultado final." };
			},
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "revisa los logs", source: "interactive" }, ctx);

		const intermediate = await handlers.get("message_end")![0]({
			message: { role: "assistant", content: [
				{ type: "text", text: "I will inspect the logs." },
				{ type: "toolCall", name: "bash", arguments: {} },
			] },
		}, ctx);
		const finalResult = await handlers.get("message_end")![0]({
			message: { role: "assistant", content: [{ type: "text", text: "That was the final result." }] },
		}, ctx);

		assert.equal(intermediate, undefined);
		assert.equal(translatedInput, "That was the final result.");
		assert.deepEqual(finalResult.message.content, [{ type: "text", text: "Ese fue el resultado final." }]);
	});

	it("keeps final-answer language decisions stable per pending routed turn", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const translatedAnswers: string[] = [];
		let routeCall = 0;
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry() {},
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => {
				routeCall += 1;
				return routeCall === 1
					? {
						englishPrompt: "Improve the router.",
						sourceLanguage: "es",
						thinkingLevel: "medium",
						translateFinalAnswer: true,
					}
					: {
						englishPrompt: "Check the router.",
						sourceLanguage: "en",
						thinkingLevel: "low",
						translateFinalAnswer: false,
					};
			},
			translateFinalAnswer: async (answer: string) => {
				translatedAnswers.push(answer);
				return { englishAnswer: answer, spanishAnswer: `Traducido: ${answer}` };
			},
		});
		await commands.get("router")!.handler("on", ctx);

		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);
		await handlers.get("input")![0]({ text: "Check the router.", source: "interactive" }, ctx);

		const first = await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "First answer." }] } }, ctx);
		const second = await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Second answer." }] } }, ctx);

		assert.deepEqual(translatedAnswers, ["First answer."]);
		assert.deepEqual(first.message.content, [{ type: "text", text: "Traducido: First answer." }]);
		assert.equal(second, undefined);
	});

	it("consumes pending routed turns in FIFO order", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const appended: Array<[string, any]> = [];
		let routeCall = 0;
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry(type: string, data: any) { appended.push([type, data]); },
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => {
				routeCall += 1;
				return {
					englishPrompt: routeCall === 1 ? "First routed prompt." : "Second routed prompt.",
					sourceLanguage: "es",
					thinkingLevel: "medium",
					translateFinalAnswer: true,
				};
			},
			translateFinalAnswer: async (answer: string) => ({
				englishAnswer: answer,
				spanishAnswer: `Traducido: ${answer}`,
			}),
		});
		await commands.get("router")!.handler("on", ctx);

		await handlers.get("input")![0]({ text: "primer prompt", source: "interactive" }, ctx);
		await handlers.get("input")![0]({ text: "segundo prompt", source: "interactive" }, ctx);
		await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "First answer." }] } }, ctx);
		await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Second answer." }] } }, ctx);

		const completed = appended.filter(([, entry]) => entry.phase === "complete").map(([, entry]) => entry.details.transformedPrompt);
		assert.deepEqual(completed, ["First routed prompt.", "Second routed prompt."]);
	});

	it("skips final answer translation for multi-text-part messages to avoid losing content", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const appended: Array<[string, any]> = [];
		let translateCalls = 0;
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry(type: string, data: any) { appended.push([type, data]); },
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Improve the router.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer: string) => {
				translateCalls += 1;
				return { englishAnswer: answer, spanishAnswer: "Traducido." };
			},
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		const result = await handlers.get("message_end")![0]({
			message: {
				role: "assistant",
				content: [
					{ type: "text", text: "First part." },
					{ type: "image", url: "file://screenshot.png" },
					{ type: "text", text: "Second part." },
				],
			},
		}, ctx);

		assert.equal(translateCalls, 0);
		assert.equal(result, undefined);
		assert.equal(appended.at(-1)![0], "pi-router-details");
		assert.equal(appended.at(-1)![1].phase, "complete");
		assert.deepEqual(appended.at(-1)![1].details.fallbackEvents, ["final answer translation skipped: unsupported message content"]);
	});

	it("skips final answer translation when the only text part has non-string text", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const appended: Array<[string, any]> = [];
		let translateCalls = 0;
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry(type: string, data: any) { appended.push([type, data]); },
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Improve the router.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer: string) => {
				translateCalls += 1;
				return { englishAnswer: answer, spanishAnswer: "Traducido." };
			},
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		const result = await handlers.get("message_end")![0]({
			message: {
				role: "assistant",
				content: [{ type: "text", text: 42 }],
			},
		}, ctx);

		assert.equal(translateCalls, 0);
		assert.equal(result, undefined);
		assert.equal(appended.at(-1)![1].phase, "complete");
		assert.deepEqual(appended.at(-1)![1].details.fallbackEvents, ["final answer translation skipped: unsupported message content"]);
	});

	it("warns and dispatches the original prompt when router model fallback occurs", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			appendEntry() {},
			setThinkingLevel() {},
		};
		const ctx = { ui: { notify(message: string) { notifications.push(message); }, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async (prompt: string) => ({
				englishPrompt: prompt,
				sourceLanguage: "unknown",
				thinkingLevel: "medium",
				translateFinalAnswer: false,
				degradedReason: "router model unavailable: timeout",
			}),
		});
		await commands.get("router")!.handler("on", ctx);

		const result = await handlers.get("input")![0]({ text: "Dame el estado actual del router", source: "interactive" }, ctx);

		assert.deepEqual(result, { action: "transform", text: "Dame el estado actual del router" });
		assert.match(notifications.at(-1)!, /translation unavailable; dispatching original prompt/);
	});

	it("warns that final answer fallback may show original or partially translated output", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry() {},
		};
		const ctx = { ui: { notify(message: string) { notifications.push(message); }, setStatus() {} } };

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Improve the router.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer: string) => ({
				englishAnswer: answer,
				spanishAnswer: "Parcial.",
				degradedReason: "chunk 2: final answer translation unavailable: empty response",
			}),
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }, ctx);

		assert.match(notifications.at(-1)!, /showing original or partially translated answer/);
	});

	it("handles strict router model failure without dispatching the original Spanish prompt", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			appendEntry() {},
			setThinkingLevel() {},
		};
		const ctx = { ui: { notify(message: string) { notifications.push(message); }, setStatus() {} } };

		installPiRouter(pi as any, {
			config: { ...DEFAULT_TEST_CONFIG, routerModel: { ...DEFAULT_TEST_CONFIG.routerModel, fallbackMode: "error" } },
			routePrompt: async (prompt: string) => ({
				englishPrompt: prompt,
				sourceLanguage: "unknown",
				thinkingLevel: "medium",
				translateFinalAnswer: false,
				degradedReason: "router model unavailable: timeout",
			}),
		});
		await commands.get("router")!.handler("on", ctx);

		const result = await handlers.get("input")![0]({ text: "Dame el estado actual del router", source: "interactive" }, ctx);

		assert.deepEqual(result, { action: "handled" });
		assert.match(notifications.at(-1)!, /router model unavailable: timeout/);
	});

	it("shows immediate routing feedback before waiting for the router model", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const statuses: Array<[string, string]> = [];
		let resolveRoute!: (value: any) => void;
		const routeStarted = new Promise<void>((resolve) => {
			const pi = {
				registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
				on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
				setThinkingLevel() {},
				appendEntry() {},
			};
			installPiRouter(pi as any, {
				routePrompt: async () => {
					resolve();
					return await new Promise((routeResolve) => { resolveRoute = routeResolve; });
				},
			});
		});
		const ctx = { ui: { notify() {}, setStatus(name: string, value: string) { statuses.push([name, value]); } } };
		await commands.get("router")!.handler("on", ctx);

		const pending = handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);
		await routeStarted;

		assert.deepEqual(statuses.at(-1), ["pi-router", "router:on routing..."]);

		resolveRoute({
			englishPrompt: "Improve the router.",
			sourceLanguage: "es",
			thinkingLevel: "medium",
			translateFinalAnswer: true,
		});
		const result = await pending;

		assert.deepEqual(result, { action: "transform", text: "Improve the router." });
		assert.deepEqual(statuses.at(-1), ["pi-router", "router:on thinking:medium"]);
	});

	it("persists router state changes and restores them in new sessions", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<void> | void>>();
		const savedStates: any[] = [];
		const statuses: Array<[string, string | undefined]> = [];
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<void> | void) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
		};
		const ctx = {
			ui: {
				notify(message: string) { notifications.push(message); },
				setStatus(name: string, value: string | undefined) { statuses.push([name, value]); },
			},
		};

		installPiRouter(pi as any, {
			stateStore: {
				loadState: () => "on",
				saveState: (state) => { savedStates.push(state); },
			},
		});

		await handlers.get("session_start")![0]({}, ctx);
		await commands.get("router")!.handler("off", ctx);
		await commands.get("router")!.handler("on", ctx);

		assert.deepEqual(statuses[0], ["pi-router", "router:on"]);
		assert.deepEqual(savedStates, [
			{ state: "off", localMode: "on" },
			{ state: "on", localMode: "on" },
		]);
		assert.deepEqual(notifications, ["Pi router disabled", "Pi router enabled"]);
	});

	it("switches local mode off, persists it, selects remote routing, and stops local llama.cpp", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<void> | void>>();
		const savedStates: any[] = [];
		const stoppedModels: string[] = [];
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<void> | void) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
		};
		const ctx = { ui: { notify(message: string) { notifications.push(message); }, setStatus() {} } };

		installPiRouter(pi as any, {
			stateStore: { loadState: () => undefined, saveState: (state) => savedStates.push(state) },
			localLifecycle: {
				ensureRunning: async () => ({ status: "already-running" }),
				stop: async (model) => { stoppedModels.push(`${model.provider}/${model.model}`); return { status: "stopped" }; },
			},
		});

		await commands.get("router")!.handler("local off", ctx);
		await commands.get("router")!.handler("", ctx);

		assert.deepEqual(savedStates, [{ state: "off", localMode: "off" }]);
		assert.deepEqual(stoppedModels, ["llama-cpp/gemma4"]);
		assert.deepEqual(notifications, [
			"Pi router local mode disabled; using remote GPT-5.4 Nano router model",
			"router:off local:off routerModel:openai-codex/gpt-5.4-nano workModel:unknown",
		]);
	});

	it("switches local mode on, persists it, selects local routing, and starts llama.cpp when down", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const savedStates: any[] = [];
		const ensuredModels: string[] = [];
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on() {},
		};
		const ctx = { ui: { notify(message: string) { notifications.push(message); }, setStatus() {} } };

		installPiRouter(pi as any, {
			stateStore: { loadState: () => ({ localMode: "off" }), saveState: (state) => savedStates.push(state) },
			localLifecycle: {
				ensureRunning: async (model) => { ensuredModels.push(`${model.provider}/${model.model}`); return { status: "started" }; },
				stop: async () => ({ status: "stopped" }),
			},
		});

		await commands.get("router")!.handler("local on", ctx);
		await commands.get("router")!.handler("", ctx);

		assert.deepEqual(savedStates, [{ state: "off", localMode: "on" }]);
		assert.deepEqual(ensuredModels, ["llama-cpp/gemma4"]);
		assert.deepEqual(notifications, [
			"Pi router local mode enabled; started local llama.cpp router model",
			"router:off local:on routerModel:llama-cpp/gemma4 workModel:unknown",
		]);
	});

	it("shows local command usage without changing state for missing or unknown actions", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const savedStates: any[] = [];
		const notifications: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on() {},
		};
		const ctx = { ui: { notify(message: string) { notifications.push(message); }, setStatus() {} } };

		installPiRouter(pi as any, {
			stateStore: { loadState: () => undefined, saveState: (state) => savedStates.push(state) },
		});

		await commands.get("router")!.handler("local", ctx);
		await commands.get("router")!.handler("local maybe", ctx);

		assert.deepEqual(savedStates, []);
		assert.deepEqual(notifications, [
			"router local:on usage:/router local on|off",
			"router local:on usage:/router local on|off",
		]);
	});

	it("keeps local mode unchanged when toggling router on and off", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const savedStates: any[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on() {},
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			stateStore: { loadState: () => ({ localMode: "off" }), saveState: (state) => savedStates.push(state) },
		});

		await commands.get("router")!.handler("on", ctx);
		await commands.get("router")!.handler("off", ctx);

		assert.deepEqual(savedStates, [
			{ state: "on", localMode: "off" },
			{ state: "off", localMode: "off" },
		]);
	});

	it("routes prompts with the active remote router model when local mode is off", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const routedModels: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry() {},
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			stateStore: { loadState: () => ({ localMode: "off" }), saveState() {} },
			routePrompt: async (_prompt, routerModel) => {
				routedModels.push(`${routerModel.provider}/${routerModel.model}`);
				return {
					englishPrompt: "Improve the router.",
					sourceLanguage: "es",
					thinkingLevel: "medium",
					translateFinalAnswer: false,
				};
			},
		});
		await commands.get("router")!.handler("on", ctx);

		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		assert.deepEqual(routedModels, ["openai-codex/gpt-5.4-nano"]);
	});

	it("translates final answers with the active remote router model when local mode is off", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const translatedModels: string[] = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) { commands.set(name, command); },
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
			setThinkingLevel() {},
			appendEntry() {},
		};
		const ctx = { ui: { notify() {}, setStatus() {} } };

		installPiRouter(pi as any, {
			stateStore: { loadState: () => ({ localMode: "off" }), saveState() {} },
			routePrompt: async () => ({
				englishPrompt: "Improve the router.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
			translateFinalAnswer: async (answer, routerModel) => {
				translatedModels.push(`${routerModel.provider}/${routerModel.model}`);
				return { englishAnswer: answer, spanishAnswer: "Listo." };
			},
		});
		await commands.get("router")!.handler("on", ctx);
		await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		await handlers.get("message_end")![0]({ message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }, ctx);

		assert.deepEqual(translatedModels, ["openai-codex/gpt-5.4-nano"]);
	});

	it("can turn routing on and transform normal input while keeping commands untouched", async () => {
		const commands = new Map<string, { handler: (args: string, ctx: any) => Promise<void> }>();
		const handlers = new Map<string, Array<(event: any, ctx: any) => Promise<any>>>();
		const appended: Array<[string, any]> = [];
		const pi = {
			registerCommand(name: string, command: { handler: (args: string, ctx: any) => Promise<void> }) {
				commands.set(name, command);
			},
			on(event: string, handler: (event: any, ctx: any) => Promise<any>) {
				handlers.set(event, [...(handlers.get(event) ?? []), handler]);
			},
			setThinkingLevel(_level: string) {},
			getThinkingLevel() { return "medium"; },
			appendEntry(type: string, data: any) { appended.push([type, data]); },
		};
		const notifications: string[] = [];
		const ctx = {
			ui: {
				notify(message: string) { notifications.push(message); },
				setStatus() {},
			},
		};

		installPiRouter(pi as any, {
			routePrompt: async () => ({
				englishPrompt: "Improve the router.",
				sourceLanguage: "es",
				thinkingLevel: "medium",
				translateFinalAnswer: true,
			}),
		});
		await commands.get("router")!.handler("on", ctx);

		const commandResult = await handlers.get("input")![0]({ text: "/model", source: "interactive" }, ctx);
		const routedResult = await handlers.get("input")![0]({ text: "mejora el router", source: "interactive" }, ctx);

		assert.deepEqual(commandResult, { action: "continue" });
		assert.deepEqual(routedResult, { action: "transform", text: "Improve the router." });
		assert.equal(appended[0][0], "pi-router-details");
		assert.equal(appended[0][1].expanded, false);
		assert.deepEqual(notifications, ["Pi router enabled"]);
	});
});
