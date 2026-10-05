"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createChapter, createSeries, login, register, type FormState } from "../actions";
import { DEFAULT_STYLE, GENRES, STYLES } from "@/lib/styles";

function Submit({ children, pending: pendingLabel }: { children: React.ReactNode; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn w-full" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

function ErrorBox({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {state.error}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <input className="input" name="email" type="email" placeholder="Correo" required />
      <input className="input" name="password" type="password" placeholder="Contraseña" required />
      <ErrorBox state={state} />
      <Submit pending="Entrando…">Entrar</Submit>
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-accent-2 hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <input className="input" name="username" placeholder="Nombre de usuario" required />
      <input className="input" name="email" type="email" placeholder="Correo" required />
      <input className="input" name="password" type="password" placeholder="Contraseña (mín. 8)" required />
      <ErrorBox state={state} />
      <Submit pending="Creando cuenta…">Crear cuenta</Submit>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="text-accent-2 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function PanelCountField({ max }: { max: number }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">Número de viñetas</span>
      <input className="input" type="number" name="panelCount" min={4} max={max} defaultValue={Math.min(12, max)} />
      <span className="text-xs text-muted">Más viñetas = capítulo más largo, pero tarda y cuesta más.</span>
    </label>
  );
}

export function CreateSeriesForm({ maxPanels }: { maxPanels: number }) {
  const [state, action] = useActionState(createSeries, undefined);
  return (
    <form action={action} className="space-y-6">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Tu idea</span>
        <textarea
          className="input min-h-40"
          name="idea"
          required
          placeholder="Ej: Un cazador de rango E muere en una mazmorra y despierta 10 años en el pasado con un sistema que solo él puede ver. Esta vez jura proteger a su hermana…"
        />
        <span className="text-xs text-muted">
          Cuenta de qué trata, los personajes y qué pasa en el capítulo. Cuanto más detalle, mejor.
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Estilo visual</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {STYLES.map((s) => (
            <label
              key={s.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/15"
            >
              <input type="radio" name="style" value={s.key} defaultChecked={s.key === DEFAULT_STYLE} className="accent-violet-500" />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Géneros</legend>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <label
              key={g.key}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/20"
            >
              <input type="checkbox" name="genres" value={g.key} className="sr-only" />
              {g.label}
            </label>
          ))}
        </div>
      </fieldset>

      <PanelCountField max={maxPanels} />
      <ErrorBox state={state} />
      <Submit pending="Enviando…">Generar capítulo 1</Submit>
    </form>
  );
}

export function NewChapterForm({ seriesId, maxPanels }: { seriesId: string; maxPanels: number }) {
  const [state, action] = useActionState(createChapter, undefined);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="seriesId" value={seriesId} />
      <label className="block space-y-1">
        <span className="text-sm font-medium">¿Qué pasa en este capítulo?</span>
        <textarea
          className="input min-h-40"
          name="idea"
          required
          placeholder="Ej: El protagonista entra por primera vez a la torre y se enfrenta al guardián del piso 1…"
        />
        <span className="text-xs text-muted">La IA recuerda los capítulos anteriores y los personajes.</span>
      </label>
      <PanelCountField max={maxPanels} />
      <ErrorBox state={state} />
      <Submit pending="Enviando…">Generar capítulo</Submit>
    </form>
  );
}
