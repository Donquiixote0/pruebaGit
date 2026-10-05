"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { runChapterPipeline } from "@/lib/pipeline";
import { DEFAULT_STYLE, GENRES, STYLES } from "@/lib/styles";
import { chapterUrl } from "@/lib/series";

export type FormState = { error?: string } | undefined;

// ---------- Cuentas ----------

const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(24, "Máximo 24 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo"),
  email: z.email("Correo no válido").trim().toLowerCase(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { username, email, password } = parsed.data;

  const exists = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) return { error: "Ese correo o nombre de usuario ya está registrado" };

  const user = await db.user.create({
    data: { username, email, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect("/crear");
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Correo o contraseña incorrectos" };
  }
  await createSession(user.id);
  redirect(String(formData.get("next") || "/"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------- Generación ----------

const maxPanels = () => clamp(Number(process.env.MAX_PANELS) || 16, 4, 30);

const MAX_IDEA = 4000;
const MAX_TEXT = 30000;

const ChapterSchema = z
  .object({
    mode: z.enum(["idea", "adaptar"]).catch("idea"),
    idea: z.string().trim().min(20, "Cuéntanos un poco más: al menos 20 caracteres"),
    panelCount: z.coerce.number().int().min(4).max(30),
  })
  .refine((d) => d.idea.length <= (d.mode === "adaptar" ? MAX_TEXT : MAX_IDEA), {
    error: (issue) =>
      (issue.input as { mode: string }).mode === "adaptar"
        ? `El texto es demasiado largo (máx. ${MAX_TEXT} caracteres). Divídelo en varios capítulos.`
        : `La idea es demasiado larga (máx. ${MAX_IDEA} caracteres). Si es un capítulo ya escrito, usa "Adaptar mi texto".`,
  });

function parseChapterForm(formData: FormData) {
  return ChapterSchema.safeParse({
    mode: formData.get("mode"),
    idea: formData.get("idea"),
    panelCount: formData.get("panelCount"),
  });
}

async function checkDailyLimit(userId: string) {
  const limit = Number(process.env.DAILY_CHAPTER_LIMIT) || 3;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await db.chapter.count({ where: { authorId: userId, createdAt: { gte: since } } });
  return count >= limit ? `Llegaste al límite de ${limit} capítulos por día. Vuelve mañana.` : null;
}

export async function createSeries(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/crear");

  const parsed = parseChapterForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const style = String(formData.get("style") || DEFAULT_STYLE);
  if (!STYLES.some((s) => s.key === style)) return { error: "Estilo no válido" };
  const genres = formData
    .getAll("genres")
    .map(String)
    .filter((g) => GENRES.some((x) => x.key === g));

  const limitError = await checkDailyLimit(user.id);
  if (limitError) return { error: limitError };

  const shortId = randomBytes(4).toString("hex");
  const series = await db.series.create({
    data: {
      shortId,
      slug: `nueva-serie-${shortId}`,
      title: "Generando historia…",
      style,
      genres: genres.join(","),
      authorId: user.id,
      chapters: {
        create: {
          number: 1,
          prompt: parsed.data.idea,
          mode: parsed.data.mode,
          panelCount: Math.min(parsed.data.panelCount, maxPanels()),
          authorId: user.id,
        },
      },
    },
    include: { chapters: true },
  });

  after(() => runChapterPipeline(series.chapters[0].id));
  redirect(chapterUrl(series, 1));
}

export async function createChapter(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const series = await db.series.findUnique({
    where: { id: String(formData.get("seriesId")) },
    include: { chapters: { orderBy: { number: "desc" }, take: 1 } },
  });
  if (!series) return { error: "La serie no existe" };
  if (series.authorId !== user.id) return { error: "Solo el autor puede añadir capítulos" };
  const last = series.chapters[0];
  if (last && last.status !== "READY") {
    return { error: "Espera a que termine el capítulo anterior antes de crear otro" };
  }

  const parsed = parseChapterForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const limitError = await checkDailyLimit(user.id);
  if (limitError) return { error: limitError };

  const number = (last?.number ?? 0) + 1;
  const chapter = await db.chapter.create({
    data: {
      seriesId: series.id,
      number,
      prompt: parsed.data.idea,
      mode: parsed.data.mode,
      panelCount: Math.min(parsed.data.panelCount, maxPanels()),
      authorId: user.id,
    },
  });

  after(() => runChapterPipeline(chapter.id));
  redirect(chapterUrl(series, number));
}

/** Reanuda un capítulo que falló o se quedó a medias (solo genera lo que falta). */
export async function retryChapter(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const chapter = await db.chapter.findUnique({
    where: { id: String(formData.get("chapterId")) },
    include: { series: true },
  });
  if (!chapter || chapter.authorId !== user.id) return;

  await db.$transaction([
    db.panel.updateMany({ where: { chapterId: chapter.id, status: "FAILED" }, data: { status: "PENDING" } }),
    db.chapter.update({ where: { id: chapter.id }, data: { status: "PENDING", error: null } }),
  ]);
  after(() => runChapterPipeline(chapter.id));
  revalidatePath(chapterUrl(chapter.series, chapter.number));
}

export async function deleteSeries(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const series = await db.series.findUnique({ where: { id: String(formData.get("seriesId")) } });
  if (!series || series.authorId !== user.id) return;
  await db.series.delete({ where: { id: series.id } });
  redirect("/mis-series");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
