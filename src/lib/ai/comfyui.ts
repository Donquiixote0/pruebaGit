import "server-only";
import { randomUUID } from "node:crypto";
import type { GeneratedImage, ImageProvider, ImageRequest } from "./types";

const QUALITY_TAGS = "masterpiece, best quality, very aesthetic, absurdres, highres";
const NEGATIVE =
  "lowres, worst quality, low quality, bad anatomy, bad hands, extra fingers, missing fingers, deformed, blurry, jpeg artifacts, text, letters, speech bubble, watermark, signature, logo, username";

// Tamaños nativos de SDXL (más o menos 1 megapíxel)
const SIZES: Record<ImageRequest["size"], [number, number]> = {
  "1024x1536": [832, 1216],
  "1024x1024": [1024, 1024],
  "1536x1024": [1216, 832],
};

/**
 * Dibuja con ComfyUI corriendo en tu propia tarjeta gráfica (gratis).
 * Usa un checkpoint SDXL de estilo anime (por ejemplo Animagine XL o NoobAI XL).
 * Ver docs/IA-LOCAL.md
 */
export class ComfyUIProvider implements ImageProvider {
  readonly name = "comfyui";
  // ComfyUI dibuja de una en una; mandar más solo las deja esperando en su cola
  readonly concurrency = 1;
  private url = (process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/$/, "");
  private steps = Number(process.env.COMFYUI_STEPS) || 28;
  private cfg = Number(process.env.COMFYUI_CFG) || 5;
  private checkpoint?: string;

  async generateImage(req: ImageRequest): Promise<GeneratedImage> {
    const [width, height] = SIZES[req.size];
    const ckpt = await this.getCheckpoint();
    // Nota: las imágenes de referencia (req.references) se ignoran por ahora;
    // la consistencia viene de repetir la descripción fija de cada personaje.
    const workflow = {
      "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: ckpt } },
      "2": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 1], text: `${QUALITY_TAGS}, ${req.prompt}` } },
      "3": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 1], text: NEGATIVE } },
      "4": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } },
      "5": {
        class_type: "KSampler",
        inputs: {
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["4", 0],
          seed: Math.floor(Math.random() * 2 ** 32),
          steps: this.steps,
          cfg: this.cfg,
          sampler_name: "euler_ancestral",
          scheduler: "normal",
          denoise: 1,
        },
      },
      "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
      "7": { class_type: "SaveImage", inputs: { images: ["6", 0], filename_prefix: "inkverse" } },
    };

    const queued = await this.request<{ prompt_id: string; node_errors?: Record<string, unknown> }>("/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: randomUUID() }),
    });

    const image = await this.waitForImage(queued.prompt_id);
    const params = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
    const res = await fetch(`${this.url}/view?${params}`);
    if (!res.ok) throw new Error(`ComfyUI no devolvió la imagen (${res.status})`);
    return { data: Buffer.from(await res.arrayBuffer()), ext: "png" };
  }

  /** Usa COMFYUI_CHECKPOINT o, si no está, el primer modelo instalado en ComfyUI. */
  private async getCheckpoint() {
    if (this.checkpoint) return this.checkpoint;
    const info = await this.request<{
      CheckpointLoaderSimple: { input: { required: { ckpt_name: [string[]] } } };
    }>("/object_info/CheckpointLoaderSimple");
    const available = info.CheckpointLoaderSimple.input.required.ckpt_name[0];
    const wanted = process.env.COMFYUI_CHECKPOINT?.trim();
    if (wanted && !available.includes(wanted)) {
      throw new Error(`ComfyUI no tiene el modelo "${wanted}". Instalados: ${available.join(", ") || "ninguno"}`);
    }
    const chosen = wanted || available[0];
    if (!chosen) throw new Error("ComfyUI no tiene ningún modelo instalado en models/checkpoints");
    this.checkpoint = chosen;
    return chosen;
  }

  private async waitForImage(promptId: string) {
    const deadline = Date.now() + 30 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      const history = await this.request<Record<string, ComfyHistory>>(`/history/${promptId}`);
      const entry = history[promptId];
      if (!entry) continue; // aún en cola o dibujando
      if (entry.status?.status_str === "error") throw new Error("ComfyUI falló al dibujar la imagen");
      const images = Object.values(entry.outputs ?? {}).flatMap((o) => o.images ?? []);
      if (images.length) return images[0];
      if (entry.status?.completed) throw new Error("ComfyUI terminó sin generar imagen");
    }
    throw new Error("ComfyUI tardó demasiado (más de 30 minutos)");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.url}${path}`, init);
    } catch {
      throw new Error(`No se pudo conectar con ComfyUI en ${this.url}. ¿Está abierto?`);
    }
    if (!res.ok) throw new Error(`ComfyUI respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json() as Promise<T>;
  }
}

type ComfyHistory = {
  status?: { status_str?: string; completed?: boolean };
  outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }>;
};
