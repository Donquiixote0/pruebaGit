import "server-only";
import { db } from "./db";

/** El slug termina en el shortId ("mi-historia-ab12cd"), así un cambio de título no rompe los enlaces. */
export async function findSeriesBySlug(slug: string) {
  const shortId = slug.split("-").pop() ?? "";
  return db.series.findUnique({
    where: { shortId },
    include: {
      author: { select: { username: true } },
      characters: { orderBy: { name: "asc" } },
      chapters: { orderBy: { number: "asc" } },
    },
  });
}

export function seriesUrl(series: { slug: string }) {
  return `/series/${series.slug}`;
}

export function chapterUrl(series: { slug: string }, number: number) {
  return `/series/${series.slug}/capitulo/${number}`;
}
