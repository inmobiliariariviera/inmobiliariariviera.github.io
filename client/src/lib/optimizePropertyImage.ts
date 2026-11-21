const MAX_IMAGE_EDGE = 1920;
const WEBP_QUALITIES = [0.82, 0.72, 0.62];

function toWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

export async function optimizePropertyImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let output: Blob | null = null;
    for (const quality of WEBP_QUALITIES) {
      output = await toWebpBlob(canvas, quality);
      if (output && output.size <= 7 * 1024 * 1024) break;
    }
    if (!output || output.size >= file.size) return file;

    const stem = file.name.replace(/\.[^.]+$/, "") || "foto-propiedad";
    return new File([output], `${stem}.webp`, { type: "image/webp", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
