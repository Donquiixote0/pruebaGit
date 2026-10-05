import type { Metadata } from "next";
import { Header } from "./components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "InkVerse — Manhwas creados con IA", template: "%s · InkVerse" },
  description: "Escribe una idea y la IA la convierte en un capítulo de manhwa a color.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border py-6 text-center text-sm text-muted">
          InkVerse · Historias e imágenes generadas con IA
        </footer>
      </body>
    </html>
  );
}
