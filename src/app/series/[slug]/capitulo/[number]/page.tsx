import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { findSeriesBySlug, chapterUrl, seriesUrl } from "@/lib/series";
import { mediaUrl } from "@/lib/storage";
import { retryChapter } from "@/app/actions";
import { AutoRefresh } from "@/app/components/auto-refresh";

type Dialogue = { speaker: string; text: string };

export async function generateMetadata({ params }: PageProps<"/series/[slug]/capitulo/[number]">): Promise<Metadata> {
  const { slug, number } = await params;
  const series = await findSeriesBySlug(slug);
  return { title: series ? `${series.title} — Capítulo ${number}` : "Capítulo" };
}

const STEPS = [
  { key: "PENDING", label: "En cola" },
  { key: "WRITING", label: "Escribiendo el guion" },
  { key: "DRAWING", label: "Dibujando personajes y viñetas" },
  { key: "READY", label: "¡Listo!" },
];

export default async function ChapterReader({ params }: PageProps<"/series/[slug]/capitulo/[number]">) {
  const { slug, number: raw } = await params;
  const number = Number(raw);
  const series = await findSeriesBySlug(slug);
  if (!series || !Number.isInteger(number)) notFound();
  if (series.slug !== slug) redirect(chapterUrl(series, number));

  const chapter = await db.chapter.findUnique({
    where: { seriesId_number: { seriesId: series.id, number } },
    include: { panels: { orderBy: { index: "asc" } } },
  });
  if (!chapter) notFound();

  const user = await getCurrentUser();
  const isAuthor = user?.id === chapter.authorId;
  if (chapter.status !== "READY" && !isAuthor) notFound();

  const generating = ["PENDING", "WRITING", "DRAWING"].includes(chapter.status);
  const done = chapter.panels.filter((p) => p.status === "READY").length;
  const failed = chapter.panels.filter((p) => p.status === "FAILED").length;
  const readyNumbers = series.chapters.filter((c) => c.status === "READY").map((c) => c.number);
  const prev = readyNumbers.filter((n) => n < number).pop();
  const next = readyNumbers.find((n) => n > number);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {generating && <AutoRefresh />}

      <div className="text-center">
        <Link href={seriesUrl(series)} className="text-sm text-accent-2 hover:underline">
          {series.title}
        </Link>
        <h1 className="text-2xl font-bold">
          Capítulo {chapter.number}
          {chapter.title && <span className="text-muted"> — {chapter.title}</span>}
        </h1>
      </div>

      {generating && (
        <div className="card space-y-4 p-5">
          <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {STEPS.map((step, i) => {
              const current = STEPS.findIndex((s) => s.key === chapter.status);
              return (
                <li key={step.key} className={i <= current ? "text-foreground" : "text-muted"}>
                  {i < current ? "✓" : i === current ? "●" : "○"} {step.label}
                </li>
              );
            })}
          </ol>
          {chapter.panels.length > 0 && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${(done / chapter.panels.length) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {done} de {chapter.panels.length} viñetas dibujadas. Puedes dejar esta página abierta.
              </p>
            </div>
          )}
        </div>
      )}

      {(chapter.status === "FAILED" || (chapter.error && !generating)) && (
        <div className="card space-y-3 border-red-500/40 p-5">
          <p className="text-red-300">{chapter.error ?? "Algo salió mal."}</p>
          {isAuthor && (
            <form action={retryChapter}>
              <input type="hidden" name="chapterId" value={chapter.id} />
              <button className="btn">Reintentar lo que falta</button>
            </form>
          )}
        </div>
      )}

      {/* Lector vertical estilo webtoon */}
      <div className="overflow-hidden rounded-xl bg-black">
        {chapter.panels.map((panel) => {
          const dialogues = JSON.parse(panel.dialogues) as Dialogue[];
          const src = mediaUrl(panel.imagePath);
          return (
            <figure key={panel.id} className="relative">
              {panel.narration && (
                <figcaption className="mx-auto max-w-xl px-6 py-4 text-center text-sm italic text-neutral-300">
                  {panel.narration}
                </figcaption>
              )}
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={panel.scene} loading="lazy" className="block w-full" />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center bg-surface-2 text-sm text-muted">
                  {panel.status === "FAILED" ? "No se pudo dibujar esta viñeta" : "Dibujando…"}
                </div>
              )}
              {dialogues.length > 0 && (
                <div className="space-y-3 px-4 py-4">
                  {dialogues.map((d, i) => (
                    <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%] rounded-2xl bg-white px-4 py-2 text-black shadow">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700">{d.speaker}</p>
                        <p className="text-[15px] leading-snug">{d.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </figure>
          );
        })}
      </div>

      {chapter.status === "READY" && (
        <nav className="flex items-center justify-between gap-3">
          {prev ? (
            <Link href={chapterUrl(series, prev)} className="btn-ghost">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <Link href={seriesUrl(series)} className="text-sm text-muted hover:text-foreground">
            Todos los capítulos
          </Link>
          {next ? (
            <Link href={chapterUrl(series, next)} className="btn">
              Siguiente →
            </Link>
          ) : isAuthor ? (
            <Link href={`${seriesUrl(series)}/nuevo-capitulo`} className="btn">
              Continuar historia →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      {failed > 0 && !generating && <p className="text-center text-xs text-muted">{failed} viñetas con error.</p>}
    </div>
  );
}
