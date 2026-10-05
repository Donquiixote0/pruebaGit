@AGENTS.md

# InkVerse

Plataforma para generar manhwas con IA (idea → guion → fichas de personaje → viñetas). Interfaz y textos en español.

- Comprobaciones antes de hacer commit: `npm run typecheck && npm run lint`
- Proveedores en `src/lib/ai/` (se eligen con `TEXT_PROVIDER` / `IMAGE_PROVIDER`). Sin configuración ni `OPENAI_API_KEY` se usa `MockProvider` (`mock.ts`): sirve para probar todo el flujo gratis.
- Las descripciones visuales que se envían al modelo de imágenes van en inglés; todo lo que ve el usuario va en español.
- Los diálogos se muestran en HTML sobre las viñetas, nunca dentro de la imagen.
- `src/lib/pipeline.ts` debe seguir siendo reanudable: cada paso se salta si su resultado ya existe.
