import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/ai";
import { CreateSeriesForm } from "../components/forms";

export const metadata: Metadata = { title: "Crear historia" };

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/crear");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crear una nueva historia</h1>
        <p className="text-muted">
          Describe tu idea. La IA escribe el capítulo 1, diseña a los personajes y dibuja cada viñeta.
        </p>
      </div>
      {isDemoMode() && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Modo demo: no hay <code>OPENAI_API_KEY</code> configurada, así que se generan imágenes de prueba gratis.
        </p>
      )}
      <div className="card p-6">
        <CreateSeriesForm maxPanels={Number(process.env.MAX_PANELS) || 16} />
      </div>
    </div>
  );
}
