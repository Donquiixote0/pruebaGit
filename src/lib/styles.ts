export type VisualStyle = {
  key: string;
  label: string;
  prompt: string;
};

export const STYLES: VisualStyle[] = [
  {
    key: "manhwa",
    label: "Manhwa coreano a color",
    prompt:
      "modern Korean manhwa / webtoon art style, full color, clean sharp lineart, cel shading with soft gradients, vibrant cinematic lighting, highly detailed, beautiful expressive faces, professional digital illustration",
  },
  {
    key: "anime",
    label: "Anime moderno",
    prompt:
      "modern high-budget anime key visual style, full color, crisp lineart, dramatic lighting, detailed backgrounds, studio-quality digital painting",
  },
  {
    key: "manga",
    label: "Manga blanco y negro",
    prompt:
      "Japanese manga style, black and white ink, screentones, dynamic hatching, high contrast, professional manga page quality",
  },
  {
    key: "semirealista",
    label: "Semi-realista",
    prompt:
      "semi-realistic digital painting, cinematic concept art, detailed rendering, dramatic volumetric lighting, rich colors",
  },
  {
    key: "acuarela",
    label: "Acuarela / cuento",
    prompt:
      "soft watercolor storybook illustration, delicate textures, warm palette, gentle lighting, painterly",
  },
  {
    key: "chibi",
    label: "Chibi / comedia",
    prompt:
      "cute chibi comedic webtoon style, bright colors, exaggerated expressions, thick clean outlines",
  },
];

export const DEFAULT_STYLE = "manhwa";

export function getStyle(key: string): VisualStyle {
  return STYLES.find((s) => s.key === key) ?? STYLES[0];
}

export const GENRES: { key: string; label: string }[] = [
  { key: "accion", label: "Acción" },
  { key: "aventura", label: "Aventura" },
  { key: "fantasia", label: "Fantasía" },
  { key: "romance", label: "Romance" },
  { key: "comedia", label: "Comedia" },
  { key: "drama", label: "Drama" },
  { key: "misterio", label: "Misterio" },
  { key: "terror", label: "Terror" },
  { key: "ciencia-ficcion", label: "Ciencia ficción" },
  { key: "artes-marciales", label: "Artes marciales" },
  { key: "isekai", label: "Isekai" },
  { key: "regresion", label: "Regresión" },
  { key: "sistema", label: "Sistema / Niveles" },
  { key: "escolar", label: "Escolar" },
  { key: "slice-of-life", label: "Recuentos de la vida" },
  { key: "historico", label: "Histórico" },
];

export function genreLabel(key: string) {
  return GENRES.find((g) => g.key === key)?.label ?? key;
}

export function parseGenres(value: string) {
  return value
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}
