import type { Metadata } from "next";
import { LoginForm } from "../components/forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const { next } = await searchParams;
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <h1 className="text-center text-2xl font-bold">Entrar</h1>
      <div className="card p-6">
        <LoginForm next={safeNext} />
      </div>
    </div>
  );
}
