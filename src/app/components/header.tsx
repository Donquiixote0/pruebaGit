import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "../actions";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-tight">
          Ink<span className="text-accent">Verse</span>
        </Link>
        <nav className="flex flex-1 items-center gap-4 text-sm text-muted">
          <Link href="/series" className="hover:text-foreground">
            Series
          </Link>
          {user && (
            <Link href="/mis-series" className="hover:text-foreground">
              Mis series
            </Link>
          )}
        </nav>
        <Link href="/crear" className="btn text-sm">
          + Crear
        </Link>
        {user ? (
          <form action={logout} className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">@{user.username}</span>
            <button className="text-muted hover:text-foreground">Salir</button>
          </form>
        ) : (
          <Link href="/entrar" className="text-sm text-muted hover:text-foreground">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
