import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { listAIConfigs } from "@/services/ai-config.service";
import {
  AddAIConfigForm,
  AIConfigCard,
} from "@/components/settings/ai-config-forms";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function AISettingsPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId || !hasRole(user.role, "principal")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Kelola AI" description="Provider dan API key" />
        <Empty
          icon={Cpu}
          title="Akses terbatas"
          description="Hanya Kepala Sekolah yang dapat mengelola konfigurasi AI."
        />
      </div>
    );
  }

  let configs: Awaited<ReturnType<typeof listAIConfigs>> = [];
  let loadError: string | null = null;
  try {
    configs = await listAIConfigs();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Gagal memuat konfigurasi";
  }

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Pengaturan
      </Link>

      <PageHeader
        eyebrow="Pengaturan"
        title="Kelola AI"
        description="Urutan coba: prioritas terkecil dulu, lalu konfigurasi berikutnya, terakhir konfigurasi server (.env). Kunci penuh tidak pernah ditampilkan."
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {!loadError && configs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((c) => (
            <AIConfigCard key={c.id} config={c} />
          ))}
        </div>
      )}

      {!loadError && configs.length === 0 && (
        <Empty
          icon={Cpu}
          title="Belum ada konfigurasi AI"
          description="Aplikasi memakai konfigurasi server (.env). Tambahkan kunci cadangan agar fitur AI tetap hidup saat kuota utama habis."
        />
      )}

      <Panel
        title="Tambah Konfigurasi"
        description="Tempel API key + base URL + nama model dari penyedia Anda. Contoh LongCat: base URL gateway-nya, model persis dari dokumentasi mereka."
      >
        <AddAIConfigForm />
      </Panel>
    </div>
  );
}
