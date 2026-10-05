import { readStoredFile } from "@/lib/storage";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
};

export async function GET(_req: Request, ctx: RouteContext<"/api/media/[...path]">) {
  const { path } = await ctx.params;
  const relative = path.join("/");
  const ext = relative.split(".").pop() ?? "";
  if (!TYPES[ext]) return new Response("Not found", { status: 404 });
  try {
    const data = await readStoredFile(relative);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
