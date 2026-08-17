import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePlaceholderIntegrity } from "../src/placeholder-integrity.ts";

describe("placeholder integrity", () => {
	it("accepts the same normalized placeholder multiset", () => {
		assert.equal(validatePlaceholderIntegrity(
			"§P0§ __PI_ROUTER_INLINE_1__ __PI_ROUTER_PRESERVED_BLOCK_2__",
			"§P0§ __PI_ROUTER_EN_LINEA_1__ __PI_ROUTER_PRESERVADO_BLOCK_2__",
		), null);
	});

	it("rejects missing protected placeholders", () => {
		assert.match(validatePlaceholderIntegrity("Review §P0§ and §P1§", "Revisa §P0§") ?? "", /placeholder mismatch/);
	});

	it("rejects duplicated fenced-block placeholders", () => {
		assert.match(validatePlaceholderIntegrity(
			"Before __PI_ROUTER_PRESERVED_BLOCK_0__ after",
			"Antes __PI_ROUTER_PRESERVED_BLOCK_0__ __PI_ROUTER_PRESERVED_BLOCK_0__ después",
		) ?? "", /placeholder mismatch/);
	});

	it("rejects malformed numeric placeholder suffixes", () => {
		assert.match(validatePlaceholderIntegrity("§P0§", "§P0§3__") ?? "", /malformed placeholder/);
		assert.match(validatePlaceholderIntegrity("__PI_ROUTER_INLINE_0__", "__PI_ROUTER_INLINE_0__0__") ?? "", /malformed placeholder/);
	});
});
