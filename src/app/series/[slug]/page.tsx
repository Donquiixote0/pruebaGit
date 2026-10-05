import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { findSeriesBySlug, chapterUrl } from "@/lib/series";
import { mediaUrl } from "@/lib/storage";
import { genreLabel, getStyle, parseGenres } from "@/lib/styles";
import { deleteSeries } from "../../actions";

export async function generateMetadata({ params }: PageProps<"/series/[slug]">): Promise<Metadata> {
  const series = await findSeriesBySlug((await params).slug);
  return { title: series?.title ?? "Serie", description: series?.synopsis };
}

const STATUS: Record<string, string> = {
  PENDING: "En cola",
  WRITING: "Escribiendo…",
  DRAWING: "Dibujando…",
  FAILED: "Error",
};

export default async function SeriesDetail({ params }: PageProps<"/series/[slug]">) {
  const { slug } = await params;
  const series = await findSeriesBySlug(slug);
  if (!series) notFound();
  if (series.slug !== slug) redirect(`/series/${series.slug}`);

  const user = await getCurrentUser();
  const isAuthor = user?.id === series.authorId;
  const cover = mediaUrl(series.coverPath);
  const chapters = isAuthor ? series.chapters : series.chapters.filter((c) => c.status === "READY");
  const first = chapters.find((c) => c.status === "READY");

  return (
    <div className="space-y-8">
      <section className="grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="mx-auto aspect-[2/3] w-48 overflow-hidden rounded-xl border border-border bg-surface-2 sm:w-full">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={series.title} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black">{series.title}</h1>
          <p className="text-sm text-muted">
            por @{series.author.username} · {getStyle(series.style).label}
          </p>
          <div className="flex flex-wrap gap-2">
            {parseGenres(series.genres).map((g) => (
              <Link key={g} href={`/series?genero=${g}`} className="rounded-full bg-surface-2 px-3 py-1 text-xs">
                {genreLabel(g)}
              </Link>
            ))}
          </div>
          <p className="leading-relaxed">{series.synopsis}</p>
          <div className="flex flex-wrap gap-3">
            {first && (
              <Link href={chapterUrl(series, first.number)} className="btn">
                Leer desde el capítulo 1
              </Link>
            )}
            {isAuthor && (
              <Link href={`/series/${series.slug}/nuevo-capitulo`} className="btn-ghost">
                + Nuevo capítulo
              </Link>
            )}
          </div>
        </div>
      </section>

      {series.characters.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Personajes</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {series.characters.map((c) => (
              <div key={c.id} className="w-28 shrink-0 text-center">
                <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface-2">
                  {c.refImagePath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(c.refImagePath)!} alt={c.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted">{c.role}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Capítulos</h2>
        <ul className="card divide-y divide-border">
          {[...chapters].reverse().map((c) => (
            <li key={c.id}>
              <Link
                href={chapterUrl(series, c.number)}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2"
              >
                <span>
                  <span className="font-semibold">Capítulo {c.number}</span>
                  {c.title && <span className="text-muted"> — {c.title}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {STATUS[c.status] ?? c.createdAt.toLocaleDateString("es")}
                </span>
              </Link>
            </li>
          ))}
          {chapters.length === 0 && <li className="px-4 py-3 text-muted">Sin capítulos todavía.</li>}
        </ul>
      </section>

      {isAuthor && (
        <form action={deleteSeries} className="text-right">
          <input type="hidden" name="seriesId" value={series.id} />
          <button className="text-sm text-red-400 hover:underline">Eliminar serie</button>
        </form>
      )}
    </div>
  );
}
