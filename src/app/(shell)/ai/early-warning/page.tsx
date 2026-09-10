import Link from "next/link";
import { ShieldCheck, Siren } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getActiveWarnings,
  getRuleFindings,
} from "@/services/warning.service";
import {
  FindingCard,
  StoredWarningCard,
} from "@/components/warnings/warning-cards";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function EarlyWarningPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Early Warning"
          description="Guru yang membutuhkan perhatian khusus"
        />
        <Empty
          icon={Siren}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda untuk melihat peringatan."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  let findings: Awaited<ReturnType<typeof getRuleFindings>> = [];
  let stored: Awaited<ReturnType<typeof getActiveWarnings>> = [];
  let loadError: string | null = null;

  try {
    [findings, stored] = await Promise.all([
      getRuleFindings(),
      getActiveWarnings(),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Gagal memuat data peringatan";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kecerdasan"
        title="Early Warning"
        description="Deteksi deterministik dari data sekolah. AI hanya menjelaskan — tingkat prioritas ditentukan sistem."
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {!loadError && (
        <>
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">
              Hasil Deteksi{" "}
              <span className="tnum text-muted-foreground">
                ({findings.length})
              </span>
            </h3>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Ambang: &lt;75 rendah • &lt;70 sedang • &lt;60 + overdue tinggi/kritis
            </p>
          </div>

          {findings.length === 0 ? (
            <Panel>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700/10">
                  <ShieldCheck
                    className="h-5 w-5 text-emerald-800"
                    aria-hidden
                  />
                </span>
                <div>
                  <p className="font-semibold">Tidak ada peringatan aktif</p>
                  <p className="text-sm text-muted-foreground">
                    Semua indikator guru berada dalam batas normal.
                  </p>
                </div>
              </div>
            </Panel>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {findings.map((f, i) => (
                <FindingCard
                  key={`${f.teacherId}-${f.type}-${i}`}
                  finding={f}
                />
              ))}
            </div>
          )}

          <div className="flex items-baseline justify-between pt-2">
            <h3 className="font-semibold">
              Dalam Pantauan{" "}
              <span className="tnum text-muted-foreground">
                ({stored.length})
              </span>
            </h3>
          </div>

          {stored.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada peringatan tersimpan. Simpan temuan dari hasil deteksi
              untuk memantaunya, atau{" "}
              <Link
                href="/growth"
                className="font-medium text-brand hover:underline"
              >
                tinjau perkembangan guru
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {stored.map((w) => (
                <StoredWarningCard key={w.id} warning={w} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
