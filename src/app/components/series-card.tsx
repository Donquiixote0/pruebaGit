import Link from "next/link";
import { mediaUrl } from "@/lib/storage";
import { genreLabel, parseGenres } from "@/lib/styles";

type Props = {
  series: {
    slug: string;
    title: string;
    genres: string;
    coverPath: string | null;
    _count?: { chapters: number };
  };
};

export function SeriesCard({ series }: Props) {
  const cover = mediaUrl(series.coverPath);
  const genres = parseGenres(series.genres).slice(0, 2);
  return (
    <Link href={`/series/${series.slug}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={series.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted">
            Dibujando portada…
          </div>
        )}
        {series._count && (
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs">
            {series._count.chapters} cap.
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold group-hover:text-accent-2">{series.title}</h3>
      {genres.length > 0 && (
        <p className="text-xs text-muted">{genres.map(genreLabel).join(" · ")}</p>
      )}
    </Link>
  );
}
