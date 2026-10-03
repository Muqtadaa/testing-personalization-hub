import { AnthropicProvider } from "./anthropic";
import { MockProvider } from "./mock";
import type { LLMProvider } from "./provider";

// Factory: real Anthropic provider when a key is present, otherwise the mock.
let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (provider) return provider;
  const key = process.env.ANTHROPIC_API_KEY;
  provider = key ? new AnthropicProvider(key) : new MockProvider();
  if (!key) {
    console.warn(
      "[llm] ANTHROPIC_API_KEY not set — using MockProvider. Set the key for real LLM behavior.",
    );
  }
  return provider;
}

export type { LLMProvider } from "./provider";
