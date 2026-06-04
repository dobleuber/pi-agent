export interface ProtectedTextMask {
	text: string;
	restore(text: string): string;
	values: string[];
}

const PROTECTED_TOKEN_PREFIX = "__PI_ROUTER_PROTECTED_";
const PROTECTED_TOKEN_SUFFIX = "__";
const PROTECTED_SPAN_PATTERN = /https?:\/\/[^\s`'"<>)\]]+|@?(?:\.{1,2}|~|\/?[A-Za-z0-9_.-]+)\/[^\s`'"<>)\]]+/g;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?]+$/;

export function maskProtectedSpans(text: string): ProtectedTextMask {
	const values: string[] = [];
	const masked = text.replace(PROTECTED_SPAN_PATTERN, (match) => {
		const trailing = match.match(TRAILING_PUNCTUATION_PATTERN)?.[0] ?? "";
		const value = trailing ? match.slice(0, -trailing.length) : match;
		if (!isPathLikeProtectedSpan(value)) return match;
		const token = `${PROTECTED_TOKEN_PREFIX}${values.length}${PROTECTED_TOKEN_SUFFIX}`;
		values.push(value);
		return token + trailing;
	});
	return {
		text: masked,
		values,
		restore(output: string): string {
			let restored = output;
			values.forEach((value, index) => {
				const optionalAt = value.startsWith("@") ? "@?" : "";
				const placeholder = new RegExp(`${optionalAt}_{0,2}PI_ROUTER_(?:PROTECI?TED|PROTEGID[OA])_${index}_{0,2}`, "gi");
				restored = restored.replace(placeholder, value);
			});
			return restored;
		},
	};
}

function isPathLikeProtectedSpan(value: string): boolean {
	if (/^https?:\/\//.test(value)) return true;
	const normalized = value.startsWith("@") ? value.slice(1) : value;
	if (normalized.startsWith("./") || normalized.startsWith("../") || normalized.startsWith("~/") || normalized.startsWith("/")) {
		return true;
	}
	if (normalized.endsWith("/")) return true;
	const segments = normalized.split("/");
	const lastSegment = segments.at(-1) ?? "";
	return segments.some((segment) => segment.startsWith(".")) || /\.[A-Za-z0-9][A-Za-z0-9_-]*$/.test(lastSegment);
}
