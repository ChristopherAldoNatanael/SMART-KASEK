import Link from "next/link";
import { BarChart3, BellRing, CheckCheck, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { buildSchoolContext } from "@/lib/ai/context";
import { getStoredInsights } from "@/services/ai.service";
import InsightGenerator from "@/components/ai/insight-generator";
import { Empty, PageHeader, Panel, Stat } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function AISchoolInsightPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="School Insight"
          description="Analisis kondisi sekolah berbasis data"
        />
        <Empty
          icon={BarChart3}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda untuk melihat insight sekolah."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  let context: Awaited<ReturnType<typeof buildSchoolContext>> | null = null;
  let stored: Awaited<ReturnType<typeof getStoredInsights>> = [];
  let loadError: string | null = null;

  try {
    [context, stored] = await Promise.all([
      buildSchoolContext(user.schoolId),
      getStoredInsights(),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Gagal memuat data sekolah";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kecerdasan"
        title="School Insight"
        description="Potret kondisi sekolah dari data nyata — dasar sesi generate insight AI di bawah."
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {context && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Users} label="Total Guru" value={context.teacherCount} />
            <Stat
              icon={BarChart3}
              label="Rata-rata Growth"
              value={
                context.averageGrowth !== null
                  ? `${context.averageGrowth}`
                  : "—"
              }
              tone="brand"
            />
            <Stat
              icon={CheckCheck}
              label="Supervisi Selesai"
              value={`${context.supervisionStats.completed}/${context.supervisionStats.total}`}
            />
            <Stat
              icon={BellRing}
              label="Peringatan Aktif"
              value={context.recentWarnings.length}
              tone={context.recentWarnings.length > 0 ? "danger" : "default"}
            />
          </div>

          {context.competencyAverages.length > 0 && (
            <Panel
              title="Rata-rata Kompetensi"
              description="Agregat sekolah yang menjadi bahan analisis AI"
            >
              <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                {context.competencyAverages.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 truncate text-sm text-muted-foreground">
                      {c.name}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{
                          width: `${Math.min(100, Math.max(0, c.averageScore))}%`,
                        }}
                      />
                    </span>
                    <span className="tnum w-10 text-right text-sm font-semibold">
                      {c.averageScore}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      <Panel
        title="Generate Insight AI"
        description="AI membaca angka di atas dan merangkum prioritas sekolah."
      >
        <InsightGenerator />
      </Panel>

      {stored.length > 0 && (
        <Panel
          title="Riwayat Insight"
          description="Hasil generate sebelumnya yang masih aktif"
        >
          <ul className="divide-y">
            {stored.map((insight) => (
              <li key={insight.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{insight.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(insight.generated_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {insight.content}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="text-sm text-muted-foreground">
        Butuh aksi lanjutan?{" "}
        <Link
          href="/ai/early-warning"
          className="font-medium text-brand hover:underline"
        >
          Buka Early Warning
        </Link>
      </p>
    </div>
  );
}
