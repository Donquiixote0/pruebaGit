import "server-only";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { StorySchema, type AIProvider, type ImageRequest, type StoryInput } from "./types";
import { SYSTEM_PROMPT, buildStoryPrompt } from "./prompts";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly concurrency = 3;
  private client: OpenAI;
  private textModel = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";
  private imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  private quality = (process.env.OPENAI_IMAGE_QUALITY || "medium") as "low" | "medium" | "high";

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async moderate(text: string) {
    const res = await this.client.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });
    const result = res.results[0];
    if (!result?.flagged) return null;
    const categories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([name]) => name);
    return `La idea no cumple las normas de contenido (${categories.join(", ")}).`;
  }

  async writeChapter(input: StoryInput) {
    const response = await this.client.responses.parse({
      model: this.textModel,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildStoryPrompt(input) },
      ],
      text: { format: zodTextFormat(StorySchema, "chapter") },
    });
    if (!response.output_parsed) throw new Error("La IA no devolvió un guion válido");
    return response.output_parsed;
  }

  async generateImage(req: ImageRequest) {
    const common = {
      model: this.imageModel,
      prompt: req.prompt,
      size: req.size,
      quality: this.quality,
      output_format: "webp" as const,
      n: 1,
    };
    const result = req.references.length
      ? await this.client.images.edit({
          ...common,
          image: await Promise.all(
            req.references.slice(0, 16).map((buf, i) => toFile(buf, `ref-${i}.webp`, { type: "image/webp" })),
          ),
        })
      : await this.client.images.generate(common);
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("La IA no devolvió ninguna imagen");
    return { data: Buffer.from(b64, "base64"), ext: "webp" as const };
  }
}
