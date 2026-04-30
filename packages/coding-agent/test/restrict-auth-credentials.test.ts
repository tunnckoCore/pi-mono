import { describe, expect, test } from "vitest";
import { AuthStorage } from "../src/core/auth-storage.js";
import { ExtensionRunner } from "../src/core/extensions/runner.js";
import type { ExtensionRuntime } from "../src/core/extensions/types.js";
import { ModelRegistry } from "../src/core/model-registry.js";
import { SessionManager } from "../src/core/session-manager.js";

function createRuntime(): ExtensionRuntime {
	return {
		pendingProviderRegistrations: [],
		flagValues: new Map(),
		invalidate: () => {},
	} as unknown as ExtensionRuntime;
}

describe("restricted auth credentials", () => {
	test("exposes full model registry auth access by default", () => {
		const authStorage = AuthStorage.inMemory();
		const modelRegistry = ModelRegistry.inMemory(authStorage);
		const runner = new ExtensionRunner([], createRuntime(), process.cwd(), SessionManager.inMemory(), modelRegistry);

		const ctx = runner.createContext();

		expect(ctx.modelRegistry.authStorage).toBe(authStorage);
	});

	test("hides auth storage and credential resolvers when enabled", () => {
		const authStorage = AuthStorage.inMemory();
		authStorage.setRuntimeApiKey("anthropic", "test-key");
		const modelRegistry = ModelRegistry.inMemory(authStorage);
		const runner = new ExtensionRunner(
			[],
			createRuntime(),
			process.cwd(),
			SessionManager.inMemory(),
			modelRegistry,
			true,
		);

		const ctx = runner.createContext();

		expect("authStorage" in ctx.modelRegistry).toBe(false);
		expect(Object.getOwnPropertyDescriptor(ctx.modelRegistry, "authStorage")).toBeUndefined();
		expect(Object.keys(ctx.modelRegistry)).not.toContain("authStorage");
		expect(Reflect.ownKeys(ctx.modelRegistry)).not.toContain("authStorage");
		expect(() => ctx.modelRegistry.authStorage).toThrow("Model registry auth access is restricted");
		expect(() => ctx.modelRegistry.getApiKeyForProvider("anthropic")).toThrow(
			"Model registry auth access is restricted",
		);
		expect(ctx.modelRegistry.getProviderAuthStatus("anthropic")).toEqual({
			configured: false,
			source: "runtime",
			label: "--api-key",
		});
	});
});
