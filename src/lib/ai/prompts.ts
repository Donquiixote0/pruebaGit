import type { StoryInput } from "./types";

export const SYSTEM_PROMPT = `Eres guionista profesional de manhwa/webtoon. Conviertes la idea o el texto del usuario en el guion de UN capítulo completo, listo para dibujar en formato de lectura vertical.

Reglas:
- Historia con inicio, desarrollo y un final de capítulo con gancho (cliffhanger o giro).
- Ritmo de webtoon: alterna planos generales, medios y primeros planos; usa viñetas de impacto en los momentos clave.
- Diálogos y narración en español, cortos y naturales. Las descripciones visuales (scene, shot, appearance) en inglés.
- La "appearance" de cada personaje debe ser idéntica entre capítulos: si el personaje ya existe, copia su descripción tal cual.
- En "scene" nunca pidas texto, letras, bocadillos ni onomatopeyas escritas: el texto se añade después.
- Respeta el género y el tono que pide el usuario. Contenido apto para una plataforma pública (sin sexo explícito ni gore extremo).`;

export function buildStoryPrompt(input: StoryInput) {
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
  if (input.mode === "adaptar") {
    lines.push(
      "\nMODO ADAPTACIÓN: el usuario te da el texto del capítulo ya escrito.",
      "- Adáptalo fielmente: respeta los hechos, el orden, los nombres y el tono. No inventes giros nuevos.",
      "- Reparte el texto entre las viñetas: la narración y los diálogos deben salir del texto original (puedes acortarlos para que quepan).",
      "- Si el texto es largo, elige los momentos más importantes y visuales para las viñetas.",
      `\nTexto del capítulo:\n"""${input.idea}"""`,
    );
  } else {
    lines.push(`\nIdea del usuario para este capítulo:\n"""${input.idea}"""`);
  }
  return lines.filter(Boolean).join("\n");
}
