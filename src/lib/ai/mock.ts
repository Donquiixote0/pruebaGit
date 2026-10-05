import "server-only";
import type { AIProvider, ImageRequest, StoryInput } from "./types";

/**
 * Proveedor de prueba: no llama a ninguna API ni gasta dinero.
 * Sirve para desarrollar la web sin OPENAI_API_KEY.
 */
export class MockProvider implements AIProvider {
  readonly name = "demo";

  async moderate() {
    return null;
  }

  async writeChapter(input: StoryInput) {
    await sleep(800);
    const hero = input.characters[0] ?? {
      name: "Kael",
      role: "Protagonista",
      appearance: "young man, messy black hair, silver eyes, dark long coat",
    };
    const rival = input.characters[1] ?? {
      name: "Seo-yeon",
      role: "Rival",
      appearance: "young woman, long white hair, red eyes, white knight armor",
    };
    const beats = [
      "Una ciudad bajo un cielo rojo.",
      "Algo cambió aquella noche.",
      "",
      "Y entonces, todo comenzó.",
    ];
    const panels = Array.from({ length: input.panelCount }, (_, i) => {
      const speaker = i % 2 === 0 ? hero : rival;
      return {
        scene: `Scene ${i + 1}: ${speaker.name} in a dramatic moment related to: ${input.idea.slice(0, 80)}`,
        shot: ["wide shot", "medium shot", "close-up", "low angle"][i % 4],
        characters: [speaker.name],
        narration: beats[i % beats.length],
        dialogues:
          i % 3 === 2
            ? []
            : [{ speaker: speaker.name, text: i === input.panelCount - 1 ? "Esto apenas empieza..." : `Viñeta ${i + 1}. (Modo demo)` }],
      };
    });
    return {
      seriesTitle: input.series?.title ?? titleFromIdea(input.idea),
      seriesSynopsis:
        input.series?.synopsis ??
        `Historia de demostración basada en la idea: "${input.idea.slice(0, 140)}". Configura OPENAI_API_KEY para generar historias reales.`,
      chapterTitle: input.chapterNumber === 1 ? "El comienzo" : "Nuevos caminos",
      chapterSummary: `Resumen de demostración del capítulo ${input.chapterNumber}.`,
      characters: [hero, rival],
      panels,
    };
  }

  async generateImage(req: ImageRequest) {
    await sleep(300);
    const [w, h] = req.size.split("x").map(Number);
    const hue = Math.floor(Math.random() * 360);
    const label = escapeXml((req.label ?? "Imagen de prueba").slice(0, 60));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue},55%,28%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},60%,12%)"/>
</linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${w / 2}" cy="${h / 2.6}" r="${w / 5}" fill="hsla(${hue},80%,70%,0.25)"/>
<text x="50%" y="62%" fill="#fff" font-family="sans-serif" font-size="${Math.round(w / 22)}" text-anchor="middle">${label}</text>
<text x="50%" y="68%" fill="#ffffffaa" font-family="sans-serif" font-size="${Math.round(w / 34)}" text-anchor="middle">MODO DEMO · sin OPENAI_API_KEY</text>
</svg>`;
    return { data: Buffer.from(svg), ext: "svg" as const };
  }
}

function titleFromIdea(idea: string) {
  const words = idea.trim().split(/\s+/).slice(0, 4).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Historia sin título";
}

function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
