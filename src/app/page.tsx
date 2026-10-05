import Link from "next/link";
import { db } from "@/lib/db";
import { SeriesCard } from "./components/series-card";

export default async function Home() {
  const latest = await db.series.findMany({
    where: { chapters: { some: { status: "READY" } } },
    orderBy: { updatedAt: "desc" },
    take: 12,
    include: { _count: { select: { chapters: { where: { status: "READY" } } } } },
  });

  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden px-6 py-12 sm:px-10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-transparent to-accent-2/10" />
        <div className="relative max-w-2xl space-y-4">
          <h1 className="text-3xl font-black leading-tight sm:text-5xl">
            Tu idea, convertida en <span className="text-accent-2">manhwa</span>.
          </h1>
          <p className="text-lg text-muted">
            Escribe de qué trata tu historia y la IA crea el guion, diseña los personajes y dibuja cada viñeta a
            color, lista para leer en scroll vertical.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/crear" className="btn">
              Crear mi historia
            </Link>
            <Link href="/series" className="btn-ghost">
              Explorar series
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">Últimas actualizaciones</h2>
          <Link href="/series" className="text-sm text-accent-2 hover:underline">
            Ver todas
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="text-muted">Aún no hay series. ¡Crea la primera!</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {latest.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
