import "server-only";
import { db } from "./db";
import { getAI } from "./ai";
import type { ImageRequest } from "./ai/types";
import { getStyle, parseGenres } from "./styles";
import { readStoredFile, saveFile } from "./storage";
import { slugify } from "./slug";

const NO_TEXT =
  "Absolutely no text, letters, captions, speech bubbles, sound effects or watermarks in the image.";

// Evita lanzar dos veces el mismo capítulo en este proceso
const running = new Set<string>();

/**
 * Genera un capítulo completo: guion → fichas de personaje → portada → viñetas.
 * Es reanudable: si se corta a mitad, al volver a lanzarlo solo hace lo que falta.
 */
export async function runChapterPipeline(chapterId: string) {
  if (running.has(chapterId)) return;
  running.add(chapterId);
  try {
    await writeScript(chapterId);
    await drawChapter(chapterId);
  } catch (err) {
    console.error(`[pipeline] capítulo ${chapterId} falló`, err);
    await db.chapter.update({
      where: { id: chapterId },
      data: { status: "FAILED", error: errorMessage(err) },
    });
  } finally {
    running.delete(chapterId);
  }
}

async function writeScript(chapterId: string) {
  const chapter = await db.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    include: { series: { include: { characters: true } }, _count: { select: { panels: true } } },
  });
  if (chapter._count.panels > 0) return; // el guion ya existe

  await db.chapter.update({ where: { id: chapterId }, data: { status: "WRITING", error: null } });

  const { series } = chapter;
  const style = getStyle(series.style);
  const ai = getAI();

  const rejection = await ai.moderate(chapter.prompt);
  if (rejection) throw new Error(rejection);

  const previous = await db.chapter.findMany({
    where: { seriesId: series.id, number: { lt: chapter.number }, status: "READY" },
    orderBy: { number: "asc" },
    select: { number: true, title: true, summary: true },
  });

  const story = await ai.writeChapter({
    idea: chapter.prompt,
    genres: parseGenres(series.genres),
    styleLabel: style.label,
    panelCount: chapter.panelCount,
    chapterNumber: chapter.number,
    series: chapter.number > 1 ? { title: series.title, synopsis: series.synopsis } : undefined,
    previousChapters: previous,
    characters: series.characters.map((c) => ({ name: c.name, role: c.role, appearance: c.appearance })),
  });

  const known = new Set(series.characters.map((c) => c.name.toLowerCase()));
  await db.$transaction([
    ...(chapter.number === 1
      ? [
          db.series.update({
            where: { id: series.id },
            data: {
              title: story.seriesTitle,
              synopsis: story.seriesSynopsis,
              slug: `${slugify(story.seriesTitle) || "serie"}-${series.shortId}`,
            },
          }),
        ]
      : []),
    ...story.characters
      .filter((c) => !known.has(c.name.toLowerCase()))
      .map((c) =>
        db.character.create({
          data: { seriesId: series.id, name: c.name, role: c.role, appearance: c.appearance },
        }),
      ),
    ...story.panels.map((p, index) =>
      db.panel.create({
        data: {
          chapterId,
          index,
          scene: p.scene,
          shot: p.shot,
          characters: p.characters.join(","),
          narration: p.narration,
          dialogues: JSON.stringify(p.dialogues),
        },
      }),
    ),
    db.chapter.update({
      where: { id: chapterId },
      data: { title: story.chapterTitle, summary: story.chapterSummary },
    }),
  ]);
}

async function drawChapter(chapterId: string) {
  await db.chapter.update({ where: { id: chapterId }, data: { status: "DRAWING", error: null } });
  const chapter = await db.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    include: {
      series: { include: { characters: true } },
      panels: { orderBy: { index: "asc" } },
    },
  });
  const { series } = chapter;
  const style = getStyle(series.style);
  const ai = getAI();

  // 1. Fichas de personaje (solo las que aparecen y aún no tienen imagen)
  const appearing = new Set(chapter.panels.flatMap((p) => splitNames(p.characters)));
  const refs = new Map<string, Buffer>();
  for (const character of series.characters) {
    const key = character.name.toLowerCase();
    let refPath = character.refImagePath;
    if (!refPath && appearing.has(key)) {
      const image = await ai.generateImage({
        prompt: `${style.prompt}. Character reference sheet of ${character.name}: ${character.appearance}. Full body front view plus a face close-up, neutral expression, plain light background. ${NO_TEXT}`,
        size: "1024x1536",
        references: [],
        label: `Ficha: ${character.name}`,
      });
      refPath = await saveFile(`series/${series.id}/characters/${character.id}.${image.ext}`, image.data);
      await db.character.update({ where: { id: character.id }, data: { refImagePath: refPath } });
    }
    if (refPath && !refPath.endsWith(".svg")) refs.set(key, await readStoredFile(refPath));
  }

  // 2. Portada de la serie
  if (!series.coverPath) {
    const main = series.characters.slice(0, 3);
    const image = await ai.generateImage({
      prompt: `${style.prompt}. Dramatic webtoon series cover art for a story titled "${series.title}". ${series.synopsis} Featuring: ${main
        .map((c) => `${c.name} (${c.appearance})`)
        .join("; ")}. Epic composition, eye-catching, poster quality. ${NO_TEXT}`,
      size: "1024x1536",
      references: main.map((c) => refs.get(c.name.toLowerCase())).filter((b): b is Buffer => !!b),
      label: series.title,
    });
    const coverPath = await saveFile(`series/${series.id}/cover.${image.ext}`, image.data);
    await db.series.update({ where: { id: series.id }, data: { coverPath } });
  }

  // 3. Viñetas (en paralelo, de pocas en pocas)
  const pending = chapter.panels.filter((p) => p.status !== "READY");
  const characterInfo = new Map(series.characters.map((c) => [c.name.toLowerCase(), c]));
  await mapWithConcurrency(pending, ai.concurrency, async (panel) => {
    const names = splitNames(panel.characters);
    const cast = names
      .map((n) => characterInfo.get(n))
      .filter((c) => !!c)
      .map((c) => `${c.name}: ${c.appearance}`);
    const request: ImageRequest = {
      prompt: [
        style.prompt,
        `Vertical webtoon panel, ${panel.shot}.`,
        panel.scene,
        cast.length ? `Characters (keep their design exactly as in the reference images): ${cast.join("; ")}.` : "",
        NO_TEXT,
      ]
        .filter(Boolean)
        .join(" "),
      size: "1024x1536",
      references: names.map((n) => refs.get(n)).filter((b): b is Buffer => !!b),
      label: `Viñeta ${panel.index + 1}`,
    };
    try {
      const image = await ai.generateImage(request);
      const imagePath = await saveFile(
        `series/${series.id}/chapters/${chapter.number}/${String(panel.index + 1).padStart(3, "0")}.${image.ext}`,
        image.data,
      );
      await db.panel.update({ where: { id: panel.id }, data: { imagePath, status: "READY", error: null } });
    } catch (err) {
      console.error(`[pipeline] viñeta ${panel.index + 1} falló`, err);
      await db.panel.update({ where: { id: panel.id }, data: { status: "FAILED", error: errorMessage(err) } });
    }
  });

  const failed = await db.panel.count({ where: { chapterId, status: "FAILED" } });
  const total = chapter.panels.length;
  await db.chapter.update({
    where: { id: chapterId },
    data:
      failed === total
        ? { status: "FAILED", error: "No se pudo dibujar ninguna viñeta." }
        : { status: "READY", error: failed ? `${failed} de ${total} viñetas fallaron. Puedes reintentarlas.` : null },
  });
  await db.series.update({ where: { id: series.id }, data: { updatedAt: new Date() } });
}

function splitNames(value: string) {
  return value
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  });
  await Promise.all(workers);
}

function errorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(0, 500);
}
