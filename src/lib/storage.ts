import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STORAGE_DIR ?? "storage");

/** Guarda un archivo y devuelve su ruta relativa (la que se guarda en la base de datos). */
export async function saveFile(relativePath: string, data: Buffer | string) {
  const full = resolveSafe(relativePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return relativePath;
}

export async function readStoredFile(relativePath: string) {
  return readFile(resolveSafe(relativePath));
}

/** URL pública para mostrar una imagen guardada. */
export function mediaUrl(relativePath: string | null | undefined) {
  return relativePath ? `/api/media/${relativePath}` : null;
}

function resolveSafe(relativePath: string) {
  const full = path.resolve(ROOT, relativePath);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Ruta inválida");
  return full;
}
