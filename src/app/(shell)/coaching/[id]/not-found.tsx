import Link from "next/link";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Empty, PageHeader } from "@/components/common";

/**
 * Ditampilkan saat sesi coaching tidak ditemukan — misalnya sudah
 * dihapus oleh Kepala Sekolah sementara halaman detail masih terbuka
 * di akun lain — menggantikan halaman 404 bawaan Next.js.
 */
export default function CoachingNotFound() {
  return (
    <div className="space-y-6">
      <Link
        href="/coaching"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Coaching
      </Link>

      <PageHeader
        eyebrow="Coaching"
        title="Sesi coaching tidak ditemukan"
        description="Data mungkin sudah dihapus atau Anda tidak memiliki akses ke data ini."
      />

      <Empty
        icon={MessagesSquare}
        title="Sesi coaching tidak tersedia"
        description="Sesi ini kemungkinan baru saja dihapus oleh Kepala Sekolah, atau tautan yang Anda buka sudah kedaluwarsa. Silakan kembali ke daftar coaching untuk melihat data terbaru."
        actionHref="/coaching"
        actionLabel="Kembali ke daftar coaching"
      />
    </div>
  );
}
