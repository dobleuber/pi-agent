import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { RouterModelConfig } from "./config.ts";

export type LocalLifecycleStatus = "already-running" | "started" | "stopped" | "error";

export interface LocalLifecycleResult {
	status: LocalLifecycleStatus;
	message?: string;
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean }>;

export interface LocalRouterLifecycleDependencies {
	fetchLike?: FetchLike;
	spawnDetached?: (command: string) => Promise<void> | void;
	stopPort?: (port: number) => Promise<void> | void;
}

export interface LocalRouterLifecycle {
	ensureRunning(config: RouterModelConfig): Promise<LocalLifecycleResult>;
	stop(config: RouterModelConfig): Promise<LocalLifecycleResult>;
}

export function createLocalRouterLifecycle(dependencies: LocalRouterLifecycleDependencies = {}): LocalRouterLifecycle {
	const fetchLike = dependencies.fetchLike ?? (fetch as FetchLike);
	const spawnDetached = dependencies.spawnDetached ?? defaultSpawnDetached;
	const stopPort = dependencies.stopPort ?? defaultStopPort;
	return {
		async ensureRunning(config) {
			if (await endpointResponds(config, fetchLike)) {
				return { status: "already-running" };
			}
			try {
				await spawnDetached(localServerWrapper(config));
				return { status: "started" };
			} catch (error) {
				return { status: "error", message: errorMessage(error) };
			}
		},
		async stop(config) {
			try {
				await stopPort(modelPort(config));
				return { status: "stopped" };
			} catch (error) {
				return { status: "error", message: errorMessage(error) };
			}
		},
	};
}

async function endpointResponds(config: RouterModelConfig, fetchLike: FetchLike): Promise<boolean> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 1000);
	try {
		const response = await fetchLike(`${config.baseUrl.replace(/\/$/, "")}/models`, { signal: controller.signal });
		return response.ok;
	} catch {
		return false;
	} finally {
		clearTimeout(timeout);
	}
}

function localServerWrapper(config: RouterModelConfig): string {
	return join(homedir(), ".local", "bin", `llama-${config.model}-server`);
}

function modelPort(config: RouterModelConfig): number {
	const url = new URL(config.baseUrl);
	const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
	if (!Number.isInteger(port) || port <= 0) {
		throw new Error(`invalid local router port in ${config.baseUrl}`);
	}
	return port;
}

function defaultSpawnDetached(command: string): void {
	const child = spawn(command, [], {
		detached: true,
		stdio: "ignore",
	});
	child.unref();
}

function defaultStopPort(port: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn("sh", ["-c", `pids=$(lsof -ti tcp:${port} 2>/dev/null); if [ -n \"$pids\" ]; then kill $pids; fi`], {
			stdio: "ignore",
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`failed to stop process on port ${port}: exit ${code}`));
		});
	});
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
