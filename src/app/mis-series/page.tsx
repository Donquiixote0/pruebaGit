import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SeriesCard } from "../components/series-card";

export const metadata: Metadata = { title: "Mis series" };

export default async function MySeriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/mis-series");
  const series = await db.series.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { chapters: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis series</h1>
        <Link href="/crear" className="btn">
          + Nueva historia
        </Link>
      </div>
      {series.length === 0 ? (
        <p className="text-muted">Todavía no creaste ninguna serie.</p>
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
