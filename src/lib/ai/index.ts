import "server-only";
import { ComfyUIProvider } from "./comfyui";
import { MockProvider } from "./mock";
import { OllamaProvider } from "./ollama";
import { OpenAIProvider } from "./openai";
import type { AIProvider, ImageProvider, TextProvider } from "./types";

/**
 * Elige quién escribe y quién dibuja según el .env:
 *   TEXT_PROVIDER  = openai | ollama | demo
 *   IMAGE_PROVIDER = openai | comfyui | demo
 * Si no se indican: OpenAI si hay OPENAI_API_KEY, si no, modo demo.
 */
let cached: AIProvider | undefined;

export function getAI(): AIProvider {
  if (cached) return cached;
  const text = pickText();
  const image = pickImage();
  cached = {
    name: `${text.name}+${image.name}`,
    concurrency: image.concurrency,
    moderate: (t) => text.moderate(t),
    writeChapter: (input) => text.writeChapter(input),
    generateImage: (req) => image.generateImage(req),
  };
  return cached;
}

function openaiKey() {
  return process.env.OPENAI_API_KEY?.trim();
}

function pickText(): TextProvider {
  const choice = process.env.TEXT_PROVIDER?.trim() || (openaiKey() ? "openai" : "demo");
  if (choice === "ollama") return new OllamaProvider();
  if (choice === "openai") return new OpenAIProvider(requireKey());
  return new MockProvider();
}

function pickImage(): ImageProvider {
  const choice = process.env.IMAGE_PROVIDER?.trim() || (openaiKey() ? "openai" : "demo");
  if (choice === "comfyui") return new ComfyUIProvider();
  if (choice === "openai") return new OpenAIProvider(requireKey());
  return new MockProvider();
}

function requireKey() {
  const key = openaiKey();
  if (!key) throw new Error("Falta OPENAI_API_KEY en el archivo .env");
  return key;
}

/** true si las imágenes son de prueba (no se dibuja nada real). */
export function isDemoMode() {
  return pickImage().name === "demo";
}
