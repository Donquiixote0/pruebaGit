import "server-only";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { StorySchema, type AIProvider, type ImageRequest, type StoryInput } from "./types";

const SYSTEM_PROMPT = `Eres guionista profesional de manhwa/webtoon. Conviertes la idea del usuario en el guion de UN capítulo completo, listo para dibujar en formato de lectura vertical.

Reglas:
- Historia con inicio, desarrollo y un final de capítulo con gancho (cliffhanger o giro).
- Ritmo de webtoon: alterna planos generales, medios y primeros planos; usa viñetas de impacto en los momentos clave.
- Diálogos y narración en español, cortos y naturales. Las descripciones visuales (scene, shot, appearance) en inglés.
- La "appearance" de cada personaje debe ser idéntica entre capítulos: si el personaje ya existe, copia su descripción tal cual.
- En "scene" nunca pidas texto, letras, bocadillos ni onomatopeyas escritas: el texto se añade después.
- Respeta el género y el tono que pide el usuario. Contenido apto para una plataforma pública (sin sexo explícito ni gore extremo).`;

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
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

function buildStoryPrompt(input: StoryInput) {
  const lines = [
    `Capítulo número: ${input.chapterNumber}`,
    `Número de viñetas: exactamente ${input.panelCount}`,
    `Estilo visual: ${input.styleLabel}`,
    input.genres.length ? `Géneros: ${input.genres.join(", ")}` : "",
  ];
  if (input.series) {
    lines.push(`\nSerie existente: "${input.series.title}"`, `Sinopsis: ${input.series.synopsis}`);
    lines.push("Mantén el mismo título y sinopsis de la serie (puedes ajustar levemente la sinopsis).");
  }
  if (input.previousChapters.length) {
    lines.push("\nCapítulos anteriores:");
    for (const c of input.previousChapters) lines.push(`- Cap. ${c.number} "${c.title}": ${c.summary}`);
  }
  if (input.characters.length) {
    lines.push("\nPersonajes ya establecidos (no cambies su appearance):");
    for (const c of input.characters) lines.push(`- ${c.name} (${c.role}): ${c.appearance}`);
  }
  lines.push(`\nIdea del usuario para este capítulo:\n"""${input.idea}"""`);
  return lines.filter(Boolean).join("\n");
}
