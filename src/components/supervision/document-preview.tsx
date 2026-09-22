"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileWarning, Loader2, X } from "lucide-react";

function isPdf(mime: string, name: string): boolean {
  return mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

function isDocx(mime: string, name: string): boolean {
  const lower = name.toLowerCase();
  return (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  );
}

function isLegacyDoc(mime: string, name: string): boolean {
  const lower = name.toLowerCase();
  return mime === "application/msword" || lower.endsWith(".doc");
}

/**
 * Tombol "Lihat" + modal pratinjau dokumen supervisi.
 * - PDF: pratinjau langsung via <iframe> (tanpa download).
 * - DOCX: dirender lokal di browser memakai docx-preview (mendekati
 *   tampilan Word asli: gaya teks, tabel, daftar, dan gambar ikut tampil).
 * - DOC lama (.doc): tidak bisa dirender lokal — tampilkan ajakan
 *   unduh / konversi ke .docx.
 * - Selalu ada tombol Unduh terpisah agar pengguna tetap bisa menyimpan berkas.
 */
export default function DocumentPreviewButton({
  fileName,
  mimeType,
  url,
}: {
  fileName: string;
  mimeType: string;
  url: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pdf = isPdf(mimeType, fileName);
  const docx = !pdf && isDocx(mimeType, fileName);
  const legacyDoc = !pdf && !docx && isLegacyDoc(mimeType, fileName);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open ]);

  // Render DOCX lokal hanya saat modal dibuka (hemat bandwidth).
  // Lazy-import agar bundle jszip/docx-preview tidak membebani halaman.
  useEffect(() => {
    if (!open || !docx || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;
    container.innerHTML = "";
    setLoading(true);
    setError(null);
    setRendered(false);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Gagal mengambil berkas (${res.status})`);
        const buffer = await res.arrayBuffer();
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;
        await renderAsync(buffer, container, undefined, {
          className: "smart-docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          debug: false,
          experimental: false,
        });
        if (!cancelled) setRendered(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal mempratinjau dokumen."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, docx, url]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Pratinjau ${fileName} tanpa mengunduh`}
        className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/5 px-2 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand/10"
      >
        Lihat
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${fileName}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        >
          <button
            type="button"
            aria-label="Tutup pratinjau"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/60"
          />
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b p-3 sm:p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={fileName}>
                  {fileName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pdf
                    ? "Pratinjau PDF langsung — tidak perlu mengunduh."
                    : docx
                      ? "Pratinjau Word (teks, tabel & gambar) — tidak perlu mengunduh."
                      : legacyDoc
                        ? "Format .doc lama tidak bisa dipratinjau — unduh atau konversi ke .docx."
                        : "Pratinjau tidak tersedia untuk format ini."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={url}
                  download={fileName}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Unduh
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buka ${fileName} di tab baru`}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Tab baru
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup pratinjau dokumen"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-[50vh] flex-1 overflow-y-auto bg-muted/40">
              {pdf ? (
                <iframe
                  src={url}
                  title={`Pratinjau PDF ${fileName}`}
                  className="h-[65vh] w-full border-0 bg-white"
                />
              ) : docx ? (
                <div className="p-2 sm:p-4">
                  <style>{`.smart-docx-wrapper{background:#e5e7eb!important;padding:16px!important}.smart-docx-wrapper>.smart-docx{margin:0 auto!important;box-shadow:0 1px 6px rgba(0,0,0,.18)!important}.smart-docx img{max-width:100%!important;height:auto!important}`}</style>
                  {loading && (
                    <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Memuat pratinjau…
                    </p>
                  )}
                  {error && (
                    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg bg-white p-8 text-center shadow-sm">
                      <FileWarning
                        className="h-8 w-8 text-muted-foreground"
                        aria-hidden
                      />
                      <p className="max-w-md text-sm text-muted-foreground">
                        Pratinjau gagal: {error}. Silakan unduh untuk melihat
                        isinya.
                      </p>
                      <a
                        href={url}
                        download={fileName}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        Unduh {fileName}
                      </a>
                    </div>
                  )}
                  <div
                    ref={containerRef}
                    aria-label={`Isi dokumen ${fileName}`}
                    className={loading || error ? "hidden" : undefined}
                  />
                  {rendered && !loading && !error && (
                    <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
                      Pratinjau mendekati tampilan Word (termasuk gambar).
                      Untuk cetak / format pixel-perfect gunakan Unduh.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileWarning
                    className="h-8 w-8 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="max-w-md text-sm text-muted-foreground">
                    {legacyDoc
                      ? "Berkas .doc (Word lama) tidak dapat dipratinjau di browser. Simpan ulang sebagai .docx agar bisa pratinjau, atau unduh untuk melihat isinya."
                      : "Format ini tidak dapat dipratinjau di browser. Silakan unduh untuk melihat isinya."}
                  </p>
                  <a
                    href={url}
                    download={fileName}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Unduh {fileName}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
