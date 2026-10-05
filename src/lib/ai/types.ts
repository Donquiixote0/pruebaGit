import { z } from "zod";

export const StorySchema = z.object({
  seriesTitle: z.string().describe("Título atractivo de la serie, en español"),
  seriesSynopsis: z.string().describe("Sinopsis de la serie en 2-4 frases, en español"),
  chapterTitle: z.string().describe("Título del capítulo en español, sin la palabra \"Capítulo\" ni el número"),
  chapterSummary: z
    .string()
    .describe("Resumen de lo que pasa en este capítulo (para dar continuidad a los siguientes)"),
  characters: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().describe("Protagonista, rival, aliado..."),
        appearance: z
          .string()
          .describe(
            "Descripción visual MUY concreta y fija, en inglés: edad, cuerpo, rostro, peinado y color de pelo, color de ojos, ropa habitual, rasgos distintivos",
          ),
      }),
    )
    .describe("Todos los personajes que aparecen en el capítulo (incluidos los ya existentes)"),
  panels: z.array(
    z.object({
      scene: z
        .string()
        .describe(
          "Descripción visual de la viñeta en inglés: acción, poses, expresiones, entorno, iluminación. Sin texto ni bocadillos.",
        ),
      shot: z.string().describe("Plano de cámara en inglés: close-up, wide shot, low angle..."),
      characters: z.array(z.string()).describe("Nombres exactos de los personajes visibles"),
      narration: z.string().describe("Texto del narrador en español, o cadena vacía"),
      dialogues: z.array(
        z.object({
          speaker: z.string(),
          text: z.string().describe("Diálogo en español, corto (máx. ~20 palabras)"),
        }),
      ),
    }),
  ),
});

export type Story = z.infer<typeof StorySchema>;

export type StoryInput = {
  idea: string;
  genres: string[];
  styleLabel: string;
  panelCount: number;
  chapterNumber: number;
  series?: { title: string; synopsis: string };
  previousChapters: { number: number; title: string; summary: string }[];
  characters: { name: string; role: string; appearance: string }[];
};

export type ImageRequest = {
  prompt: string;
  size: "1024x1536" | "1024x1024" | "1536x1024";
  /** Imágenes de referencia (fichas de personaje) para mantener consistencia */
  references: Buffer[];
  /** Texto corto para la imagen de prueba en modo demo */
  label?: string;
};

export type GeneratedImage = { data: Buffer; ext: "png" | "svg" | "webp" | "jpeg" };

export interface AIProvider {
  readonly name: string;
  /** Devuelve el motivo si el texto infringe las normas, o null si está bien. */
  moderate(text: string): Promise<string | null>;
  writeChapter(input: StoryInput): Promise<Story>;
  generateImage(req: ImageRequest): Promise<GeneratedImage>;
}
