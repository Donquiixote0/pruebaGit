import "server-only";
import { MockProvider } from "./mock";
import { OpenAIProvider } from "./openai";
import type { AIProvider } from "./types";

let provider: AIProvider | undefined;

export function getAI(): AIProvider {
  if (!provider) {
    const key = process.env.OPENAI_API_KEY?.trim();
    provider = key ? new OpenAIProvider(key) : new MockProvider();
  }
  return provider;
}

export function isDemoMode() {
  return !process.env.OPENAI_API_KEY?.trim();
}
