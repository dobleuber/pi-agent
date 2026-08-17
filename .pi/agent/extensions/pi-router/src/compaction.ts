import { compact as nativeCompact } from "@earendil-works/pi-coding-agent";
import { streamSimple as nativeStream } from "@earendil-works/pi-ai/compat";
import type { ThinkingLevel } from "./router-model.ts";

interface CompactionRuntime {
	compact?: typeof nativeCompact;
	stream?: typeof nativeStream;
}

interface CompactionEventLike {
	preparation: Parameters<typeof nativeCompact>[0];
	customInstructions?: string;
	signal?: AbortSignal;
}

interface CompactionContextLike {
	model?: Parameters<typeof nativeCompact>[1];
	modelRegistry?: {
		getApiKeyAndHeaders(model: Parameters<typeof nativeCompact>[1]): Promise<
			| { ok: true; apiKey?: string; headers?: Record<string, string>; env?: Record<string, string> }
			| { ok: false; error: string }
		>;
	};
	sessionManager?: { getSessionId(): string | undefined };
}

// Temporary workaround for https://github.com/earendil-works/pi/issues/6477.
// Remove this adapter once Pi native compaction forwards sessionId itself.
export async function compactWithSessionIdentity(
	event: CompactionEventLike,
	ctx: CompactionContextLike,
	thinkingLevel?: ThinkingLevel,
	runtime: CompactionRuntime = {},
) {
	if (!ctx.model) throw new Error("Pi router compaction: model unavailable");
	if (!ctx.modelRegistry) throw new Error("Pi router compaction: model registry unavailable");
	const sessionId = ctx.sessionManager?.getSessionId();
	if (!sessionId) throw new Error("Pi router compaction: session ID unavailable");

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
	if (!auth.ok) throw new Error(`Pi router compaction auth failed: ${auth.error}`);

	const stream = runtime.stream ?? nativeStream;
	const sessionAwareStream: typeof nativeStream = (model, context, options) => stream(model, context, {
		...options,
		sessionId,
	});
	const compact = runtime.compact ?? nativeCompact;
	return compact(
		event.preparation,
		ctx.model,
		auth.apiKey,
		auth.headers,
		event.customInstructions,
		event.signal,
		thinkingLevel,
		sessionAwareStream,
		auth.env,
	);
}
