/**
 * Paste Clipboard Extension
 *
 * Attach clipboard contents (text or image) to the conversation.
 * If the current model doesn't support images, automatically switches
 * to a vision-capable model.
 *
 * Shortcuts:
 *   ctrl+shift+c  - Paste clipboard contents
 *
 * Commands:
 *   /paste-clipboard  - Paste clipboard contents
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/** Detect common image MIME types from base64 header bytes. */
function detectMimeType(base64: string): string {
	const header = base64.slice(0, 20);
	if (header.startsWith("iVBOR")) return "image/png";
	if (header.startsWith("/9j/")) return "image/jpeg";
	if (header.startsWith("R0lGOD")) return "image/gif";
	if (header.startsWith("UklGR")) return "image/webp";
	if (header.startsWith("Qk")) return "image/bmp";
	if (header.startsWith("PD94bW") || header.startsWith("PHN2Zw")) return "image/svg+xml";
	return "image/png";
}

/**
 * Read text from clipboard via PowerShell (Windows) or xclip/xsel (Unix).
 * Uses pi.exec which works in the extension context.
 */
async function readClipboardText(pi: ExtensionAPI, _ctx: ExtensionContext): Promise<string | null> {
	if (process.platform === "win32") {
		const r = await pi.exec("powershell.exe", [
			"-NoProfile", "-NonInteractive", "-Command",
			"Get-Clipboard -Format Text",
		]);
		return r.code === 0 && r.stdout.trim().length > 0 ? r.stdout : null;
	}

	// Unix: try xclip, then xsel, then wl-paste
	for (const [cmd, args] of [
		["xclip", ["-selection", "clipboard", "-o"]],
		["xsel", ["--clipboard", "--output"]],
		["wl-paste", []],
	] as const) {
		const r = await pi.exec(cmd, [...args]);
		if (r.code === 0 && r.stdout.trim()) return r.stdout;
	}
	return null;
}

/**
 * Read image from clipboard as base64 via PowerShell (Windows).
 * Shows a loader while reading. Returns null if no image or unsupported platform.
 */
async function readClipboardImage(pi: ExtensionAPI, ctx: ExtensionContext): Promise<string | null> {
	if (process.platform !== "win32") {
		// Unix clipboard image reading is complex; skip for now
		return null;
	}

	const psScript = [
		"Add-Type -AssemblyName System.Windows.Forms",
		"$img = [System.Windows.Forms.Clipboard]::GetImage()",
		"if ($img -ne $null) {",
		"  $ms = New-Object System.IO.MemoryStream",
		"  $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)",
		"  [Convert]::ToBase64String($ms.ToArray())",
		"} else {",
		"  Write-Output 'NO_IMAGE'",
		"}",
	].join("; ");

	const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
		const loader = new BorderedLoader(tui, theme, "Reading clipboard image...");
		loader.onAbort = () => done(null);

		pi.exec("powershell.exe", [
			"-NoProfile", "-NonInteractive", "-Command", psScript,
		]).then((r) => {
			if (r.code === 0 && r.stdout.trim() !== "NO_IMAGE" && r.stdout.trim().length > 0) {
				done(r.stdout.trim());
			} else {
				done(null);
			}
		}).catch(() => done(null));

		return loader;
	});

	return result;
}

/**
 * Find a vision-capable model from the registry.
 * Priority: models from the current provider first, then known models, then any available.
 */
/** Read enabledModels from settings.json */
function getEnabledModels(): Set<string> {
	try {
		const settingsPath = join(homedir(), ".pi", "agent", "settings.json");
		if (!existsSync(settingsPath)) return new Set();
		const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
		return new Set(settings.enabledModels ?? []);
	} catch {
		return new Set();
	}
}

function listVisionModels(ctx: ExtensionContext): Array<{
	provider: string;
	modelId: string;
	label: string;
	hasAuth: boolean;
}> {
	const registry = ctx.modelRegistry;
	const enabled = getEnabledModels();
	const all = registry.getAll().filter((m) => {
		if (!m.input.includes("image")) return false;
		// Only include if enabled (if enabledModels is configured)
		if (enabled.size > 0 && !enabled.has(`${m.provider}/${m.id}`)) return false;
		return true;
	});
	const preferredOrder = [
		"zai/glm-5v-turbo",
		"openai-codex/gpt-5.4",
	];

	return all
		.map((m) => ({
			provider: m.provider,
			modelId: m.id,
			label: `${m.provider}/${m.id}`,
			hasAuth: registry.hasConfiguredAuth(m),
		}))
		.sort((a, b) => {
			const aKey = `${a.provider}/${a.modelId}`;
			const bKey = `${b.provider}/${b.modelId}`;
			const aPref = preferredOrder.indexOf(aKey);
			const bPref = preferredOrder.indexOf(bKey);
			const aRank = aPref === -1 ? Number.MAX_SAFE_INTEGER : aPref;
			const bRank = bPref === -1 ? Number.MAX_SAFE_INTEGER : bPref;
			if (aRank !== bRank) return aRank - bRank;
			return a.label.localeCompare(b.label);
		});
}

/** Check if the current model supports images. */
function currentModelSupportsImages(ctx: ExtensionContext): boolean {
	return ctx.model?.input?.includes("image") ?? false;
}

/**
 * Ensure a vision model is active. Prompts user to switch if needed.
 * Returns true if a vision model is active (or was successfully switched to).
 */
async function ensureVisionModel(pi: ExtensionAPI, ctx: ExtensionContext): Promise<boolean> {
	if (currentModelSupportsImages(ctx)) return true;

	const visionModels = listVisionModels(ctx);
	if (visionModels.length === 0) {
		ctx.ui.notify(
			"Current model doesn't support images and no vision model is available.",
			"error",
		);
		return false;
	}

	const currentName = ctx.model
		? `${ctx.model.provider}/${ctx.model.id}`
		: "unknown";
	const available = visionModels.filter((m) => m.hasAuth);
	if (available.length === 0) {
		ctx.ui.notify(
			"No hay modelos con soporte de imagen que tengan auth configurada.",
			"error",
		);
		return false;
	}

	const options = available.map((m) => m.label);
	options.push("Cancelar");

	const selected = await ctx.ui.select(
		`Selecciona un modelo con soporte de imagen`,
		options,
	);
	if (!selected || selected === "Cancelar") return false;

	const selectedIndex = options.indexOf(selected);
	const visionModel = available[selectedIndex];
	if (!visionModel) return false;

	const targetName = `${visionModel.provider}/${visionModel.modelId}`;
	const model = ctx.modelRegistry.find(visionModel.provider, visionModel.modelId);
	if (!model) {
		ctx.ui.notify(`Model ${targetName} not found in registry.`, "error");
		return false;
	}

	const ok = await pi.setModel(model);
	if (!ok) {
		ctx.ui.notify(
			`No API key configured for ${targetName}. Use /login or set the key.`,
			"error",
		);
		return false;
	}

	ctx.ui.notify(`Switched to ${targetName} for image support.`, "info");
	return true;
}

/** Main entry: detect clipboard contents and paste. */
async function pasteClipboard(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	// Try image first (more interesting)
	const base64 = await readClipboardImage(pi, ctx);
	if (base64) {
		const ok = await ensureVisionModel(pi, ctx);
		if (!ok) return;

		const mimeType = detectMimeType(base64);
		pi.sendUserMessage([
			{ type: "text", text: "Pasted image from clipboard" },
			{ type: "image", data: base64, mimeType },
		]);
		ctx.ui.notify("Pasted image from clipboard", "info");
		return;
	}

	// Fallback to text
	const text = await readClipboardText(pi, ctx);
	if (text && text.trim().length > 0) {
		pi.sendUserMessage(text);
		ctx.ui.notify("Pasted text from clipboard", "info");
		return;
	}

	ctx.ui.notify("Clipboard is empty (no text or image found).", "warning");
}

export default function pasteClipboardExtension(pi: ExtensionAPI) {
	// Keyboard shortcut
	pi.registerShortcut("ctrl+shift+c", {
		description: "Paste clipboard contents (text or image) into the conversation",
		handler: async (ctx) => {
			await pasteClipboard(pi, ctx);
		},
	});

	// Command
	pi.registerCommand("paste-clipboard", {
		description: "Paste clipboard contents (text or image) into the conversation",
		handler: async (_args, ctx) => {
			await pasteClipboard(pi, ctx);
		},
	});
}
