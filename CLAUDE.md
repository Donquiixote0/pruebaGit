@AGENTS.md

# InkVerse

Plataforma para generar manhwas con IA (idea → guion → fichas de personaje → viñetas). Interfaz y textos en español.

- Comprobaciones antes de hacer commit: `npm run typecheck && npm run lint`
- Sin `OPENAI_API_KEY` la app usa `MockProvider` (`src/lib/ai/mock.ts`): sirve para probar todo el flujo gratis.
- Las descripciones visuales que se envían al modelo de imágenes van en inglés; todo lo que ve el usuario va en español.
- Los diálogos se muestran en HTML sobre las viñetas, nunca dentro de la imagen.
- `src/lib/pipeline.ts` debe seguir siendo reanudable: cada paso se salta si su resultado ya existe.
