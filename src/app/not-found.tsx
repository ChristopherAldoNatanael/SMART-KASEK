import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Empty } from "@/components/common";

/**
 * Halaman 404 global berbahasa Indonesia — menggantikan halaman
 * bawaan Next.js ("This page could not be found").
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col justify-center p-6">
      <Empty
        icon={FileQuestion}
        title="Halaman tidak ditemukan"
        description="Alamat yang Anda tuju tidak tersedia atau datanya sudah dihapus. Silakan kembali ke dashboard."
        actionHref="/dashboard"
        actionLabel="Kembali ke dashboard"
      />
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Atau gunakan menu navigasi untuk menuju halaman lain di SMART KASEK.
      </p>
    </div>
  );
}
