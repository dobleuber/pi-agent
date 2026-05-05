import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Network Retry Extension
 * 
 * Automatically retries LLM requests that fail due to network errors.
 * Uses exponential backoff with jitter to avoid overwhelming the server.
 */

const CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

const NETWORK_ERROR_PATTERNS = [
  "network_error",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EPIPE",
  "EHOSTUNREACH",
  "socket hang up",
  "fetch failed",
  "network timeout",
  "connection reset",
  "connection refused",
  "connection timeout",
  "stream interrupted",
  "unexpected eof",
];

function calculateBackoff(attempt: number): number {
  const exponentialDelay = CONFIG.baseDelayMs * Math.pow(CONFIG.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, CONFIG.maxDelayMs);
  const jitter = cappedDelay * CONFIG.jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
}

function isNetworkError(errorMsg: string): boolean {
  const lowerMsg = errorMsg.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some(pattern => 
    lowerMsg.includes(pattern.toLowerCase())
  );
}

function formatDelay(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function (pi: ExtensionAPI) {
  let retryCount = 0;
  let isRetrying = false;

  pi.on("message_end", async (event, ctx) => {
    const msg = event.message;
    
    if (msg.role !== "assistant") return;
    if (msg.stopReason !== "error") return;
    
    const errorMsg = msg.errorMessage || "";
    if (!isNetworkError(errorMsg)) return;
    
    if (isRetrying) return;
    
    if (retryCount >= CONFIG.maxRetries) {
      ctx.ui.notify(`Network error persisted after ${CONFIG.maxRetries} retries: ${errorMsg.slice(0, 100)}`, "error");
      retryCount = 0;
      isRetrying = false;
      return;
    }
    
    retryCount++;
    isRetrying = true;
    
    const delayMs = calculateBackoff(retryCount - 1);
    
    ctx.ui.notify(
      `Network error. Retrying ${retryCount}/${CONFIG.maxRetries} in ${formatDelay(delayMs)}...`,
      "info"
    );
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    const entries = ctx.sessionManager.getBranch();
    const lastUserEntry = [...entries].reverse().find(e => 
      e.type === "message" && e.message.role === "user"
    );
    
    if (lastUserEntry && lastUserEntry.type === "message") {
      pi.sendUserMessage("Please retry your last response. There was a network error.", { 
        deliverAs: "steer" 
      });
    } else {
      isRetrying = false;
    }
  });

  pi.on("turn_end", async (event, ctx) => {
    if (event.message.stopReason === "stop" || event.message.stopReason === "toolUse") {
      if (retryCount > 0) {
        ctx.ui.notify("Retry successful!", "success");
      }
      retryCount = 0;
      isRetrying = false;
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    retryCount = 0;
    isRetrying = false;
  });

  pi.on("session_shutdown", async () => {
    retryCount = 0;
    isRetrying = false;
  });
}
