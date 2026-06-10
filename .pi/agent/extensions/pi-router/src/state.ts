import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { RouterLocalMode, RouterState } from "./config.ts";

export interface PersistedRouterState {
	state?: RouterState;
	localMode?: RouterLocalMode;
}

export interface RouterStateStore {
	loadState(): PersistedRouterState | undefined;
	saveState(state: PersistedRouterState): void;
}

export function createFileRouterStateStore(
	path = join(homedir(), ".pi", "agent", "extensions", "pi-router", "router-state.json"),
): RouterStateStore {
	return {
		loadState() {
			try {
				if (!existsSync(path)) return undefined;
				const payload = JSON.parse(readFileSync(path, "utf8"));
				const state = payload?.state === "on" || payload?.state === "off" ? payload.state : undefined;
				const localMode = payload?.localMode === "on" || payload?.localMode === "off" ? payload.localMode : undefined;
				return state || localMode ? { ...(state ? { state } : {}), ...(localMode ? { localMode } : {}) } : undefined;
			} catch {
				return undefined;
			}
		},
		saveState(state) {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, JSON.stringify(state, null, 2) + "\n", "utf8");
		},
	};
}
