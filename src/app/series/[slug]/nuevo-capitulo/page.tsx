import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findSeriesBySlug } from "@/lib/series";
import { NewChapterForm } from "@/app/components/forms";

export default async function NewChapterPage({ params }: PageProps<"/series/[slug]/nuevo-capitulo">) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=/series/${slug}/nuevo-capitulo`);
  const series = await findSeriesBySlug(slug);
  if (!series || series.authorId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted">{series.title}</p>
        <h1 className="text-2xl font-bold">Capítulo {series.chapters.length + 1}</h1>
      </div>
      <div className="card p-6">
        <NewChapterForm seriesId={series.id} maxPanels={Number(process.env.MAX_PANELS) || 16} />
      </div>
    </div>
  );
}
