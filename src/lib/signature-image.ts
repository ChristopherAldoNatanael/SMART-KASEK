/**
 * Hapus background putih foto/scan (TTD & stempel) langsung di browser.
 *
 * BUKAN AI: piksel terang (kertas putih) dijadikan transparan, tinta
 * dipertahankan, lalu disimpan sebagai PNG. Cocok untuk tinta gelap di
 * kertas putih dengan cahaya rata. TIDAK cocok untuk kertas berwarna,
 * bayangan tebal, atau foto ramai — hasilnya bisa berlubang.
 *
 * Tanpa dependensi & tanpa mengunggah ke server — jalan murni di HP/laptop.
 */

export type CleanImageResult = {
  file: File;
  /** True bila background benar-benar diproses (bukan file asli). */
  cleaned: boolean;
};

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Ubah berkas gambar menjadi PNG latar transparan.
 * Foto raksasa dikecilkan dulu (maks 1600px) agar PNG hasilnya tetap ringan.
 */
export async function removeWhiteBackground(
  file: File,
  options?: { tolerance?: number; maxSize?: number }
): Promise<CleanImageResult> {
  const tolerance = options?.tolerance ?? 232;
  const maxSize = options?.maxSize ?? 1600;
  const asIs: CleanImageResult = { file, cleaned: false };

  try {
    if (!file.type.startsWith("image/")) return asIs;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return asIs;
    // Putih dulu agar JPEG (tanpa alfa) tidak jadi hitam saat dibaca.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const feather = 22;
    for (let i = 0; i < d.length; i += 4) {
      const lum = luminance(d[i], d[i + 1], d[i + 2]);
      if (lum >= tolerance) {
        d[i + 3] = 0;
      } else if (lum > tolerance - feather) {
        // Tepi tinta dibuat meluruh agar tidak bergerigi.
        d[i + 3] = Math.round(255 * ((tolerance - lum) / feather));
      }
    }
    ctx.putImageData(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return asIs;
    const name = file.name.replace(/\.[a-z0-9]+$/i, "") || "dokumen";
    return {
      file: new File([blob], `${name}.png`, { type: "image/png" }),
      cleaned: true,
    };
  } catch {
    // Gagal di browser tua → pakai berkas asli, unggahan tetap jalan.
    return asIs;
  }
}
