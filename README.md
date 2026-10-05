# InkVerse — Manhwas generados con IA

Plataforma donde cualquier usuario registrado escribe una idea y la IA la convierte en **un capítulo de manhwa a color**, listo para leer en scroll vertical, al estilo de los sitios de lectura de webtoons.

## Cómo funciona

```
Idea del usuario
   │
   ▼
1. Moderación  ── revisa que la idea cumpla las normas (OpenAI Moderation, gratis)
   │
   ▼
2. Guion       ── un modelo de texto escribe el capítulo: título, personajes
   │              (con descripción visual fija), viñetas, narración y diálogos
   ▼
3. Personajes  ── se dibuja una "ficha" de cada personaje nuevo
   │
   ▼
4. Portada     ── se dibuja la portada de la serie (solo la primera vez)
   │
   ▼
5. Viñetas     ── cada viñeta se dibuja usando las fichas como referencia,
                  para que los personajes se vean igual en todo el capítulo
```

- Los **diálogos no se dibujan dentro de la imagen**: se muestran encima como globos en HTML. Así el texto siempre sale perfecto y en español.
- Cada capítulo nuevo **recuerda** los capítulos anteriores y reutiliza las mismas fichas de personaje.
- Si algo falla a mitad de camino, el botón **"Reintentar lo que falta"** solo regenera lo que faltó, sin volver a pagar lo que ya está hecho.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Web y servidor | Next.js 16 (App Router, Server Actions) + React 19 + TypeScript |
| Estilos | Tailwind CSS 4 |
| Base de datos | Prisma + SQLite en desarrollo (PostgreSQL en producción) |
| IA de texto | OpenAI (`gpt-5.4-mini`) **o Ollama gratis en tu PC** |
| IA de imágenes | OpenAI (`gpt-image-2`) **o ComfyUI gratis con tu tarjeta NVIDIA** |
| Sesiones | Cookie firmada (JWT con `jose`) + contraseñas con `bcryptjs` |

## Empezar

Necesitas Node.js 20 o superior.

```bash
npm install
cp .env.example .env      # y edita los valores
npm run db:push           # crea la base de datos
npm run dev               # abre http://localhost:3000
```

Sin `OPENAI_API_KEY`, la app funciona en **modo demo**: genera historias e imágenes de prueba gratis, ideal para desarrollar.

## Opción gratis: generar con tu propia tarjeta gráfica

Si tienes una tarjeta NVIDIA, puedes dibujar con **ComfyUI** y escribir con **Ollama** sin pagar nada por imagen. Sigue la guía **[docs/IA-LOCAL.md](docs/IA-LOCAL.md)** y pon en `.env`:

```env
TEXT_PROVIDER="ollama"
IMAGE_PROVIDER="comfyui"
```

También puedes mezclar: por ejemplo `TEXT_PROVIDER="openai"` (historias mejores por céntimos) con `IMAGE_PROVIDER="comfyui"` (imágenes gratis).

## Conseguir la clave de OpenAI

La suscripción de **ChatGPT Plus (20 $/mes) no sirve para la API**: son cuentas de facturación separadas.

1. Entra en <https://platform.openai.com> con tu cuenta.
2. En **Settings → Billing**, añade saldo (por ejemplo 5–10 $ para probar).
3. En **API keys**, crea una clave y pégala en `.env` como `OPENAI_API_KEY`.
4. Recomendado: en **Limits**, pon un límite de gasto mensual.

### Cuánto cuesta

Casi todo el gasto está en las imágenes. Un capítulo de 12 viñetas usa unas 12 viñetas + 2–3 fichas de personaje + 1 portada ≈ **15 imágenes**. Revisa los precios actuales en <https://openai.com/api/pricing>. Para controlar el gasto:

- `OPENAI_IMAGE_QUALITY`: `low` (barato, ideal para pruebas), `medium` (equilibrado) o `high` (máxima calidad).
- `MAX_PANELS`: máximo de viñetas por capítulo.
- `DAILY_CHAPTER_LIMIT`: capítulos por usuario y día.

## Estructura

```
prisma/schema.prisma          Modelos: User, Series, Character, Chapter, Panel
src/lib/pipeline.ts           Motor de generación (guion → fichas → portada → viñetas)
src/lib/ai/                   Proveedores de IA (OpenAI, Ollama, ComfyUI y modo demo)
src/lib/styles.ts             Estilos visuales y géneros
src/app/actions.ts            Server Actions (registro, login, crear serie/capítulo)
src/app/series/               Catálogo, ficha de serie y lector
src/app/api/media/            Sirve las imágenes generadas
```

## Hoja de ruta

- [x] Cuentas de usuario
- [x] Crear serie desde una idea, continuar con más capítulos
- [x] Personajes consistentes con fichas de referencia
- [x] Catálogo con búsqueda y filtro por género, lector vertical
- [ ] Guardar imágenes en la nube (S3 / Cloudflare R2) en vez de disco
- [ ] Cola de trabajos (p. ej. BullMQ + Redis) para generar muchos capítulos a la vez
- [ ] Favoritos, comentarios, valoraciones y vistas
- [ ] Editar el guion antes de dibujar y regenerar viñetas sueltas
- [ ] Créditos o planes de pago por usuario
- [ ] Panel de administración y moderación de imágenes

## Producción

1. Cambia `provider = "sqlite"` por `"postgresql"` en `prisma/schema.prisma` y usa una base de datos Postgres (Neon, Supabase, Railway…).
2. La generación de un capítulo tarda varios minutos y corre en el propio servidor. Por eso conviene un servidor Node normal (Railway, Render, un VPS con `npm run build && npm start`) y no funciones serverless con límite de tiempo, hasta que se añada la cola de trabajos.
3. Las imágenes se guardan en `STORAGE_DIR`: usa un disco persistente o migra a S3/R2.
