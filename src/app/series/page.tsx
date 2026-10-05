import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { GENRES } from "@/lib/styles";
import { SeriesCard } from "../components/series-card";

export const metadata: Metadata = { title: "Series" };

export default async function SeriesPage({ searchParams }: PageProps<"/series">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const genre = typeof params.genero === "string" ? params.genero : "";

  const series = await db.series.findMany({
    where: {
      chapters: { some: { status: "READY" } },
      ...(q ? { title: { contains: q } } : {}),
      ...(genre ? { genres: { contains: genre } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
    include: { _count: { select: { chapters: { where: { status: "READY" } } } } },
  });

  const href = (g: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (g) sp.set("genero", g);
    const s = sp.toString();
    return s ? `/series?${s}` : "/series";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Series</h1>
        <form className="flex gap-2">
          {genre && <input type="hidden" name="genero" value={genre} />}
          <input className="input sm:w-64" name="q" defaultValue={q} placeholder="Buscar por título…" />
          <button className="btn-ghost">Buscar</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={href("")}
          className={`rounded-full border px-3 py-1 text-sm ${!genre ? "border-accent bg-accent/20" : "border-border"}`}
        >
          Todos
        </Link>
        {GENRES.map((g) => (
          <Link
            key={g.key}
            href={href(g.key)}
            className={`rounded-full border px-3 py-1 text-sm ${genre === g.key ? "border-accent bg-accent/20" : "border-border hover:bg-surface-2"}`}
          >
            {g.label}
          </Link>
        ))}
      </div>

      {series.length === 0 ? (
        <p className="text-muted">No se encontraron series.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {series.map((s) => (
            <SeriesCard key={s.id} series={s} />
          ))}
        </div>
      )}
    </div>
  );
}
