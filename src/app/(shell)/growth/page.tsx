import Link from "next/link";
import { AlertTriangle, LineChart, Sprout, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSchoolGrowthOverview } from "@/services/growth.service";
import { GrowthChart } from "@/components/charts/growth-chart";
import {
  Empty,
  PageHeader,
  Panel,
  Stat,
  TableHead,
  TableShell,
  Th,
} from "@/components/common";

export const dynamic = "force-dynamic";

const DIMENSIONS: { label: string; key: string }[] = [
  { label: "Pedagogik", key: "pedagogic_score" },
  { label: "Profesional", key: "professional_score" },
  { label: "Sosial", key: "social_score" },
  { label: "Kepribadian", key: "personality_score" },
  { label: "Digital", key: "digital_score" },
  { label: "Asesmen", key: "assessment_score" },
  { label: "Manajemen Kelas", key: "classroom_score" },
];

export default async function GrowthPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Teacher Growth"
          description="Perkembangan guru berbasis riwayat snapshot"
        />
        <Empty
          icon={Sprout}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda untuk melihat data perkembangan."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  let overview;
  try {
    overview = await getSchoolGrowthOverview();
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Teacher Growth"
          description="Perkembangan guru berbasis riwayat snapshot"
        />
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Gagal memuat data growth:{" "}
          {error instanceof Error ? error.message : "Terjadi kesalahan"}
        </div>
      </div>
    );
  }

  if (overview.teacherCount === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Teacher Growth"
          description="Perkembangan guru berbasis riwayat snapshot"
        />
        <Empty
          icon={Users}
          title="Belum ada data guru"
          description="Tambahkan guru ke sekolah ini untuk mulai memantau perkembangan."
          actionHref="/teachers"
          actionLabel="Ke Data Guru"
        />
      </div>
    );
  }

  const hasSnapshots = overview.teachers.some((t) => t.latest !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Perkembangan"
        title="Teacher Growth"
        description="Skor dihitung dari data kompetensi dan diperbarui otomatis setiap tindak lanjut coaching selesai."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={LineChart}
          label="Rata-rata Sekolah"
          value={
            overview.averageOverall !== null
              ? `${overview.averageOverall}`
              : "—"
          }
          tone="brand"
        />
        <Stat icon={Users} label="Total Guru" value={overview.teacherCount} />
        <Stat
          icon={Sprout}
          label="Tumbuh Positif"
          value={overview.positiveCount}
          tone="brand"
        />
        <Stat
          icon={AlertTriangle}
          label="Perlu Perhatian"
          value={overview.attentionCount}
          tone={overview.attentionCount > 0 ? "danger" : "default"}
        />
      </div>

      {!hasSnapshots ? (
        <Empty
          icon={Sprout}
          title="Belum ada snapshot perkembangan"
          description="Lengkapi data kompetensi guru — snapshot periode berjalan dihitung otomatis setiap ada tindak lanjut coaching yang diselesaikan."
          actionHref="/teachers"
          actionLabel="Ke Data Guru"
        />
      ) : (
        <>
          <Panel
            title="Tren Rata-rata Sekolah"
            description="Rata-rata skor overall seluruh guru per periode"
          >
            <GrowthChart
              data={overview.trend.map((t) => ({
                period: t.period,
                overall: t.average,
                pedagogic: null,
                professional: null,
                social: null,
                personality: null,
                digital: null,
                assessment: null,
                classroom: null,
              }))}
            />
          </Panel>

          <TableShell>
            <TableHead>
              <Th>Guru</Th>
              <Th>Periode</Th>
              <Th className="text-right">Overall</Th>
              <Th>Dimensi</Th>
              <Th className="text-right">Perubahan</Th>
              <Th className="text-right">Aksi</Th>
            </TableHead>
            <tbody>
              {overview.teachers.map((t) => (
                <tr
                  key={t.teacherId}
                  className="border-b transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight">{t.name}</p>
                    {t.subject && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.subject}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {t.latest?.period ?? "—"}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-lg font-bold">
                    {t.latest?.overall_score ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {t.latest ? (
                      <div className="min-w-44 space-y-1.5">
                        {DIMENSIONS.map((d) => {
                          const value =
                            (t.latest?.[
                              d.key as keyof typeof t.latest
                            ] as number | null) ?? null;
                          return (
                            <div
                              key={d.key}
                              className="flex items-center gap-2"
                            >
                              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                                {d.label}
                              </span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <span
                                  className="block h-full rounded-full bg-brand"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
                                  }}
                                />
                              </span>
                              <span className="tnum w-8 text-right text-xs font-medium">
                                {value ?? "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Belum ada snapshot
                      </span>
                    )}
                  </td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-right text-sm">
                    {t.growth === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={`font-semibold ${t.growth >= 0 ? "text-emerald-700" : "text-rose-600"}`}
                      >
                        {t.growth >= 0 ? "+" : ""}
                        {t.growth}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/teachers/${t.teacherId}`}
                      className="font-medium text-brand hover:underline"
                    >
                      Profil
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </>
      )}
    </div>
  );
}
