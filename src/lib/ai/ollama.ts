import "server-only";
import { z } from "zod";
import { StorySchema, type StoryInput, type TextProvider } from "./types";
import { SYSTEM_PROMPT, buildStoryPrompt } from "./prompts";

/**
 * Escribe la historia con un modelo local de Ollama (gratis, corre en tu PC).
 * https://ollama.com — instala y ejecuta: ollama pull qwen2.5:7b
 */
export class OllamaProvider implements TextProvider {
  readonly name = "ollama";
  private url = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  private model = process.env.OLLAMA_MODEL || "qwen2.5:7b";

  async moderate() {
    // Ollama no trae moderación: el contenido se controla con el SYSTEM_PROMPT.
    return null;
  }

  async writeChapter(input: StoryInput) {
    let res: Response;
    try {
      res = await fetch(`${this.url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: z.toJSONSchema(StorySchema),
          options: { temperature: 0.8, num_ctx: 8192 },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildStoryPrompt(input) },
          ],
        }),
        signal: AbortSignal.timeout(15 * 60 * 1000),
      });
    } catch {
      throw new Error(`No se pudo conectar con Ollama en ${this.url}. ¿Está abierto?`);
    }
    if (!res.ok) throw new Error(`Ollama respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { message?: { content?: string } };
    const parsed = StorySchema.safeParse(safeJson(data.message?.content ?? ""));
    if (!parsed.success) throw new Error("El modelo local no devolvió un guion válido. Prueba de nuevo o usa un modelo más grande.");
    return parsed.data;
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
