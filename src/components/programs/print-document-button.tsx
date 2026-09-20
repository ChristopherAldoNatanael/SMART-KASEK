"use client";

import { Printer } from "lucide-react";

/** Tombol cetak — disembunyikan saat mencetak (print:hidden). */
export default function PrintDocumentButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[48px] items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Cetak / Simpan PDF
    </button>
  );
}
