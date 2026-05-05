/**
 * Paste Files Extension
 *
 * Provides direct file attachment via keyboard shortcut and interactive UI.
 * 
 * Shortcuts:
 *   ctrl+shift+v  - Open file picker to attach file
 * 
 * Commands:
 *   /paste <path>     - Attach a file's content directly
 * 
 * Tools:
 *   paste_file       - Let the LLM attach files when requested
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Key, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { basename, extname, join, isAbsolute, dirname } from "node:path";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB for text files
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images

function isImageFile(path: string): boolean {
	return IMAGE_EXTENSIONS.includes(extname(path).toLowerCase());
}

function getMimeType(path: string): string {
	const ext = extname(path).toLowerCase();
	const mimeTypes: Record<string, string> = {
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".gif": "image/gif",
		".webp": "image/webp",
		".svg": "image/svg+xml",
		".bmp": "image/bmp",
	};
	return mimeTypes[ext] || "application/octet-stream";
}

function getFileExtension(path: string): string {
	return extname(path).toLowerCase().slice(1);
}

/**
 * List files in directory for picker
 */
function listFiles(dir: string, showHidden: boolean = false): string[] {
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		return entries
			.filter(e => showHidden || !e.name.startsWith("."))
			.sort((a, b) => {
				// Directories first
				if (a.isDirectory() && !b.isDirectory()) return -1;
				if (!a.isDirectory() && b.isDirectory()) return 1;
				return a.name.localeCompare(b.name);
			})
			.map(e => e.isDirectory() ? e.name + "/" : e.name);
	} catch {
		return [];
	}
}

/**
 * Open interactive file picker
 */
async function openFilePicker(pi: ExtensionAPI, ctx: ExtensionAPI extends { ui: any } ? any : never): Promise<string | null> {
	let currentDir = ctx.cwd;
	let selectedIndex = 0;
	let showHidden = false;
	let cachedLines: string[] | undefined;
	let currentFiles: string[] = [];
	let error: string | null = null;
	let pathInput = "";
	let isPathInputMode = false;
	
	const refresh = (tui: any) => {
		cachedLines = undefined;
		tui.requestRender();
	};
	
	const loadFiles = () => {
		try {
			currentFiles = listFiles(currentDir, showHidden);
			selectedIndex = 0;
			error = null;
		} catch (e: any) {
			currentFiles = [];
			error = e.message;
		}
	};
	
	loadFiles();
	
	const result = await ctx.ui.custom<string | null>((tui: any, theme: any, _kb: any, done: (result: string | null) => void) => {
		const handleInput = (data: string) => {
			if (isPathInputMode) {
				// Path input mode
				if (matchesKey(data, Key.escape)) {
					isPathInputMode = false;
					pathInput = "";
					refresh(tui);
					return;
				}
				if (matchesKey(data, Key.enter)) {
					if (pathInput.trim()) {
						const resolvedPath = isAbsolute(pathInput) ? pathInput : join(currentDir, pathInput);
						if (existsSync(resolvedPath)) {
							done(resolvedPath);
							return;
						}
					}
					isPathInputMode = false;
					pathInput = "";
					refresh(tui);
					return;
				}
				if (matchesKey(data, Key.backspace)) {
					pathInput = pathInput.slice(0, -1);
					refresh(tui);
					return;
				}
				// Regular character input
				if (data.length === 1 || (data.length > 1 && !data.startsWith("\x1b"))) {
					pathInput += data;
					refresh(tui);
					return;
				}
				return;
			}
			
			// File list mode
			if (matchesKey(data, Key.up)) {
				selectedIndex = Math.max(0, selectedIndex - 1);
				refresh(tui);
				return;
			}
			if (matchesKey(data, Key.down)) {
				selectedIndex = Math.min(currentFiles.length - 1, selectedIndex + 1);
				refresh(tui);
				return;
			}
			if (matchesKey(data, Key.enter)) {
				if (currentFiles.length === 0) return;
				const selected = currentFiles[selectedIndex];
				if (selected.endsWith("/")) {
					// Navigate into directory
					currentDir = join(currentDir, selected.slice(0, -1));
					loadFiles();
					refresh(tui);
				} else {
					// Select file
					done(join(currentDir, selected));
				}
				return;
			}
			if (matchesKey(data, Key.backspace)) {
				// Go up one directory
				const parent = dirname(currentDir);
				if (parent !== currentDir) {
					currentDir = parent;
					loadFiles();
					refresh(tui);
				}
				return;
			}
			if (matchesKey(data, Key.escape)) {
				done(null);
				return;
			}
			if (data === "/" || data === "\\") {
				// Start path input mode
				isPathInputMode = true;
				pathInput = "";
				refresh(tui);
				return;
			}
			if (data.toLowerCase() === "h") {
				showHidden = !showHidden;
				loadFiles();
				refresh(tui);
				return;
			}
		};
		
		const render = (width: number): string[] => {
			if (cachedLines) return cachedLines;
			
			const lines: string[] = [];
			const add = (s: string) => lines.push(truncateToWidth(s, width));
			
			add(theme.fg("accent", "╭─ Attach File ─────────────────────────────".slice(0, width)));
			add(theme.fg("dim", ` ${currentDir}`));
			
			if (error) {
				add(theme.fg("error", ` Error: ${error}`));
			} else if (currentFiles.length === 0) {
				add(theme.fg("muted", " (empty directory)"));
			} else {
				lines.push("");
				const maxShow = Math.min(currentFiles.length, 15);
				const startIdx = Math.max(0, selectedIndex - 7);
				const endIdx = Math.min(currentFiles.length, startIdx + maxShow);
				
				for (let i = startIdx; i < endIdx; i++) {
					const file = currentFiles[i];
					const isSelected = i === selectedIndex;
					const isDir = file.endsWith("/");
					const icon = isDir ? "📁 " : (isImageFile(file) ? "🖼️ " : "📄 ");
					const prefix = isSelected ? theme.fg("accent", "> ") : "  ";
					const name = isSelected ? theme.fg("accent", icon + file) : theme.fg("text", icon + file);
					add(prefix + name);
				}
				
				if (currentFiles.length > maxShow) {
					add(theme.fg("dim", ` ... ${currentFiles.length - maxShow} more`));
				}
			}
			
			lines.push("");
			
			if (isPathInputMode) {
				add(theme.fg("accent", " Path: ") + theme.fg("text", pathInput + "█"));
				add(theme.fg("dim", " Enter to confirm • Esc to cancel"));
			} else {
				add(theme.fg("dim", " ↑↓ navigate • Enter select • Backspace up • / type path • H hidden • Esc cancel"));
			}
			
			add(theme.fg("accent", "╰────────────────────────────────────────────".slice(0, width)));
			
			cachedLines = lines;
			return lines;
		};
		
		return {
			render,
			invalidate: () => {
				cachedLines = undefined;
			},
			handleInput,
		};
	});
	
	return result;
}

/**
 * Attach a file to the conversation
 */
async function attachFile(pi: ExtensionAPI, ctx: any, filePath: string): Promise<boolean> {
	const resolvedPath = isAbsolute(filePath) ? filePath : join(ctx.cwd, filePath);
	
	if (!existsSync(resolvedPath)) {
		ctx.ui.notify(`File not found: ${filePath}`, "error");
		return false;
	}
	
	const stats = statSync(resolvedPath);
	
	if (isImageFile(resolvedPath)) {
		if (stats.size > MAX_IMAGE_SIZE) {
			ctx.ui.notify(`Image too large (${Math.round(stats.size / 1024 / 1024)}MB). Max: 10MB`, "error");
			return false;
		}
		
		const imageData = readFileSync(resolvedPath);
		const base64 = imageData.toString("base64");
		const mimeType = getMimeType(resolvedPath);
		
		pi.sendUserMessage([
			{ type: "text", text: `Attached image: ${basename(filePath)}` },
			{ type: "image", data: base64, mimeType },
		]);

		ctx.ui.notify(`Attached image: ${basename(filePath)}`, "info");
		return true;
	} else {
		if (stats.size > MAX_FILE_SIZE) {
			ctx.ui.notify(`File too large (${Math.round(stats.size / 1024)}KB). Max: 1MB for text files`, "error");
			return false;
		}
		
		try {
			const content = readFileSync(resolvedPath, "utf-8");
			const ext = getFileExtension(resolvedPath);
			const lang = ext || "text";
			
			const message = `**${basename(filePath)}**\n\`\`\`${lang}\n${content}\n\`\`\``;
			
			pi.sendUserMessage(message);
			ctx.ui.notify(`Attached file: ${basename(filePath)}`, "info");
			return true;
		} catch (error) {
			ctx.ui.notify(`Could not read file: ${error}`, "error");
			return false;
		}
	}
}

export default function pasteFilesExtension(pi: ExtensionAPI) {
	// Register keyboard shortcut for file picker
	pi.registerShortcut("ctrl+shift+v", {
		description: "Open file picker to attach a file",
		handler: async (ctx) => {
			const filePath = await openFilePicker(pi, ctx);
			if (filePath) {
				await attachFile(pi, ctx, filePath);
			}
		},
	});
	
	// /paste <path> - Attach a file directly
	pi.registerCommand("paste", {
		description: "Attach a file to the conversation (image or text)",
		handler: async (args, ctx) => {
			if (!args || args.trim() === "") {
				// No args - open file picker
				const filePath = await openFilePicker(pi, ctx);
				if (filePath) {
					await attachFile(pi, ctx, filePath);
				}
				return;
			}
			
			await attachFile(pi, ctx, args.trim());
		},
	});
	
	
	// Tool: paste_file - Let LLM attach files
	pi.registerTool({
		name: "paste_file",
		label: "Paste File",
		description: "Attach a file's content to the conversation. Use this when the user wants to share a file.",
		parameters: Type.Object({
			path: Type.String({ description: "Path to the file to attach" }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const resolvedPath = isAbsolute(params.path) ? params.path : join(ctx.cwd, params.path);
			
			if (!existsSync(resolvedPath)) {
				throw new Error(`File not found: ${params.path}`);
			}
			
			const stats = statSync(resolvedPath);
			
			if (isImageFile(resolvedPath)) {
				if (stats.size > MAX_IMAGE_SIZE) {
					throw new Error(`Image too large. Max: 10MB`);
				}
				
				const imageData = readFileSync(resolvedPath);
				const base64 = imageData.toString("base64");
				const mimeType = getMimeType(resolvedPath);
				
				return {
					content: [
						{ type: "text", text: `Image: ${basename(params.path)}` },
						{ type: "image", data: base64, mimeType },
					],
					details: { path: params.path, size: stats.size, type: "image" },
				};
			} else {
				if (stats.size > MAX_FILE_SIZE) {
					throw new Error(`File too large. Max: 1MB for text files`);
				}
				
				const content = readFileSync(resolvedPath, "utf-8");
				
				return {
					content: [{ type: "text", text: content }],
					details: { path: params.path, size: stats.size, type: "text" },
				};
			}
		},
	});
}
