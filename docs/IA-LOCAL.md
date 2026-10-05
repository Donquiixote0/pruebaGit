# Generar gratis con tu propia tarjeta gráfica (Windows + NVIDIA)

Con esta guía, InkVerse dibuja las viñetas en **tu tarjeta NVIDIA** usando **ComfyUI** y escribe las historias con **Ollama**. No se paga nada por imagen. Lo que necesitas es que el PC esté encendido mientras se genera.

Requisitos: tarjeta NVIDIA (por ejemplo una RTX 3050), 16 GB de RAM y unos 20 GB libres en disco.

---

## 1. Instalar ComfyUI (el que dibuja)

1. Descarga ComfyUI para Windows desde **https://www.comfy.org/download** (instalador "ComfyUI Desktop").
   También sirve la versión *portable* de la página de *Releases* en GitHub de `comfyanonymous/ComfyUI`. Descomprímela y abre `run_nvidia_gpu.bat`.
2. Ábrelo una vez para comprobar que arranca. Fíjate en la **dirección** que muestra (por ejemplo `http://127.0.0.1:8188`). Esa es tu `COMFYUI_URL`.

### Si tu tarjeta tiene 4 GB de memoria

En la versión portable, edita `run_nvidia_gpu.bat` y añade `--lowvram` al final de la línea que arranca ComfyUI. En ComfyUI Desktop busca la opción equivalente en *Settings → Server-Config*. Irá más lento, pero funcionará.

## 2. Descargar un modelo de estilo anime / manhwa

Los modelos son archivos `.safetensors` de unos 6–7 GB. Se ponen en la carpeta **`ComfyUI/models/checkpoints`**. Opciones recomendadas (todas son **SDXL**, que es lo que tu tarjeta puede mover):

| Modelo | Dónde | Comentario |
|---|---|---|
| **Animagine XL 4.0** | huggingface.co/cagliostrolab/animagine-xl-4.0 → *Files and versions* | Anime moderno, muy buen color |
| **NoobAI XL** | huggingface.co/Laxhar (busca "noobai-XL") | Muy versátil |
| Modelos "Illustrious" o "manhwa" | civitai.com (filtra por *SDXL* o *Illustrious*, tipo *Checkpoint*) | Hay muchos con estilo webtoon coreano |

Revisa la licencia de cada modelo si piensas cobrar por la web: algunas no permiten uso comercial.

Reinicia ComfyUI después de copiar el modelo.

## 3. Instalar Ollama (el que escribe), opcional

Si prefieres que la historia la escriba OpenAI, que cuesta céntimos por capítulo, sáltate este paso.

1. Instálalo desde **https://ollama.com/download**.
2. Abre una terminal (PowerShell) y descarga un modelo:
   ```
   ollama pull qwen2.5:7b
   ```
   Con 16 GB de RAM, los modelos de unos 7–8B son el máximo cómodo. Cierra el navegador y otros programas pesados mientras generas.

## 4. Configurar InkVerse

En el archivo `.env`:

```env
TEXT_PROVIDER="ollama"        # o "openai" si usas la API para el texto
IMAGE_PROVIDER="comfyui"
COMFYUI_URL="http://127.0.0.1:8188"   # la dirección que viste en el paso 1
COMFYUI_CHECKPOINT=""                 # vacío = usa el primer modelo que encuentre
OLLAMA_MODEL="qwen2.5:7b"
```

Reinicia `npm run dev` y crea una historia. Con ComfyUI y Ollama abiertos, InkVerse les envía el trabajo automáticamente.

## Qué esperar

- **Tiempo:** en una RTX 3050, cada imagen tarda aproximadamente entre 20 segundos y 1 minuto. Un capítulo de 12 viñetas son unos 10–20 minutos. La página del capítulo muestra el progreso.
- **Calidad:** muy buena para anime/manhwa. Es algo menos fiel que OpenAI siguiendo escenas complicadas con muchos personajes.
- **Consistencia de personajes:** por ahora se consigue repitiendo la descripción fija de cada personaje en cada viñeta. Más adelante se puede añadir IP-Adapter o LoRAs por personaje para que salgan aún más parecidos.
- **Ajustes:** `COMFYUI_STEPS` (más pasos = más detalle, más lento) y `COMFYUI_CFG` (cuánto obedece al texto; para modelos anime SDXL suele ir bien entre 4 y 7).

## Problemas comunes

| Mensaje | Solución |
|---|---|
| "No se pudo conectar con ComfyUI" | ComfyUI no está abierto o la `COMFYUI_URL` no coincide |
| "ComfyUI no tiene ningún modelo instalado" | Falta copiar el `.safetensors` a `models/checkpoints` y reiniciar ComfyUI |
| Error de memoria (*out of memory*) en ComfyUI | Usa `--lowvram` y cierra otros programas |
| "El modelo local no devolvió un guion válido" | Pulsa *Reintentar* o prueba un modelo de Ollama más grande |
