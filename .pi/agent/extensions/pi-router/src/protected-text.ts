export interface ProtectedTextMask {
	text: string;
	restore(text: string): string;
	values: string[];
}

const PROTECTED_TOKEN_PREFIX = "__PI_ROUTER_PROTECTED_";
const PROTECTED_TOKEN_SUFFIX = "__";
const PROTECTED_SPAN_PATTERN = /https?:\/\/[^\s`'"<>)\]]+|(?:\.{1,2}|~|[A-Za-z0-9_.-]+)\/[^\s`'"<>)\]]+/g;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?]+$/;

export function maskProtectedSpans(text: string): ProtectedTextMask {
	const values: string[] = [];
	const masked = text.replace(PROTECTED_SPAN_PATTERN, (match) => {
		const trailing = match.match(TRAILING_PUNCTUATION_PATTERN)?.[0] ?? "";
		const value = trailing ? match.slice(0, -trailing.length) : match;
		if (!value.includes("/")) return match;
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
				restored = restored.replaceAll(`${PROTECTED_TOKEN_PREFIX}${index}${PROTECTED_TOKEN_SUFFIX}`, value);
			});
			return restored;
		},
	};
}
