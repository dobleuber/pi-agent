import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createFileRouterStateStore } from "../src/state.ts";

describe("router state store", () => {
	it("saves and restores router state and local mode", () => {
		const path = join(mkdtempSync(join(tmpdir(), "pi-router-state-")), "router-state.json");
		const store = createFileRouterStateStore(path);

		store.saveState({ state: "on", localMode: "off" });

		assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), { state: "on", localMode: "off" });
		assert.deepEqual(store.loadState(), { state: "on", localMode: "off" });
	});

	it("loads old state files without local mode", () => {
		const path = join(mkdtempSync(join(tmpdir(), "pi-router-state-")), "router-state.json");
		writeFileSync(path, JSON.stringify({ state: "on" }), "utf8");
		const store = createFileRouterStateStore(path);

		assert.deepEqual(store.loadState(), { state: "on" });
	});
});
