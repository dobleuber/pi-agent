import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROUTER_CONFIG } from "../src/config.ts";
import { createLocalRouterLifecycle } from "../src/local-lifecycle.ts";

const localModel = DEFAULT_ROUTER_CONFIG.routerModels.local;

describe("local router lifecycle", () => {
	it("reports an already running local endpoint without starting", async () => {
		const starts: string[] = [];
		const lifecycle = createLocalRouterLifecycle({
			fetchLike: async (url) => {
				assert.equal(url, "http://127.0.0.1:11434/v1/models");
				return { ok: true };
			},
			spawnDetached: async (command) => { starts.push(command); },
			stopPort: async () => {},
		});

		const result = await lifecycle.ensureRunning(localModel);

		assert.deepEqual(result, { status: "already-running" });
		assert.deepEqual(starts, []);
	});

	it("starts the configured wrapper when the local endpoint is down", async () => {
		const starts: string[] = [];
		const lifecycle = createLocalRouterLifecycle({
			fetchLike: async () => { throw new Error("connection refused"); },
			spawnDetached: async (command) => { starts.push(command); },
			stopPort: async () => {},
		});

		const result = await lifecycle.ensureRunning(localModel);

		assert.deepEqual(result, { status: "started" });
		assert.deepEqual(starts, ["/home/dobleuber/.local/bin/llama-gemma4-server"]);
	});

	it("reports start failures", async () => {
		const lifecycle = createLocalRouterLifecycle({
			fetchLike: async () => ({ ok: false }),
			spawnDetached: async () => { throw new Error("spawn failed"); },
			stopPort: async () => {},
		});

		const result = await lifecycle.ensureRunning(localModel);

		assert.equal(result.status, "error");
		assert.match(result.message ?? "", /spawn failed/);
	});

	it("stops the process bound to the local model port", async () => {
		const stoppedPorts: number[] = [];
		const lifecycle = createLocalRouterLifecycle({
			fetchLike: async () => ({ ok: true }),
			spawnDetached: async () => {},
			stopPort: async (port) => { stoppedPorts.push(port); },
		});

		const result = await lifecycle.stop(localModel);

		assert.deepEqual(result, { status: "stopped" });
		assert.deepEqual(stoppedPorts, [11434]);
	});

	it("reports stop failures", async () => {
		const lifecycle = createLocalRouterLifecycle({
			fetchLike: async () => ({ ok: true }),
			spawnDetached: async () => {},
			stopPort: async () => { throw new Error("kill failed"); },
		});

		const result = await lifecycle.stop(localModel);

		assert.equal(result.status, "error");
		assert.match(result.message ?? "", /kill failed/);
	});
});
