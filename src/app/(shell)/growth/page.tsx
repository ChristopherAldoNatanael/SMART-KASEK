import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  LineChart,
  Sprout,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyGrowthData, getSchoolGrowthOverview } from "@/services/growth.service";
import { GrowthChart } from "@/components/charts/growth-chart";
import { RecalculateGrowthButton } from "@/components/growth/recalculate-button";
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
  { label: "Asesmen", key: "assessment_score" },
  { label: "Man. Kelas", key: "classroom_score" },
];

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-foreground";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-brand";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export default async function GrowthPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Perkembangan"
          title="Teacher Growth"
          description="Pantau perkembangan guru berdasarkan data kompetensi dan coaching."
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

  if (user.role === "teacher") {
    return <TeacherGrowthView />;
  }

  let overview;
  try {
    overview = await getSchoolGrowthOverview();
  } catch (error) {    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Perkembangan"
          title="Teacher Growth"
          description="Pantau perkembangan guru berdasarkan data kompetensi dan coaching."
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
          eyebrow="Perkembangan"
          title="Teacher Growth"
          description="Pantau perkembangan guru berdasarkan data kompetensi dan coaching."
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
        description="Skor dihitung dari data kompetensi — otomatis saat supervisi diselesaikan, nilai diisi, atau tindak lanjut coaching selesai."
        actions={<RecalculateGrowthButton />}
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
          description="Isi nilai kompetensi di Data Guru atau selesaikan satu penilaian supervisi, lalu klik Hitung Ulang di atas — snapshot periode berjalan akan terisi otomatis dari data tersebut."
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
              {overview.teachers.map((t) => {
                const overall = t.latest?.overall_score ?? null;
                const isLow = overall !== null && overall < 70;
                return (
                  <tr
                    key={t.teacherId}
                    className={`border-b transition-colors last:border-0 hover:bg-muted/40 ${isLow ? "bg-rose-50/30" : ""}`}
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
                    <td className="tnum px-4 py-3 text-right">
                      <span className={`text-lg font-bold ${scoreColor(overall)}`}>
                        {overall ?? "—"}
                      </span>
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
                                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                  {d.label}
                                </span>
                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                  <span
                                    className={`block h-full rounded-full ${scoreBg(value)}`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
                                    }}
                                  />
                                </span>
                                <span className={`tnum w-8 text-right text-xs font-medium ${scoreColor(value)}`}>
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
                          className={`inline-flex items-center gap-1 font-semibold ${t.growth >= 0 ? "text-emerald-700" : "text-rose-600"}`}
                        >
                          {t.growth >= 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {t.growth >= 0 ? "+" : ""}
                          {t.growth}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/teachers/${t.teacherId}`}
                        className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                      >
                        Profil
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </>
      )}
    </div>
  );
}

/**
 * Tampilan Teacher Growth untuk role guru: HANYA snapshot milik
 * sendiri (diambil via getMyGrowthData yang memfilter teacher_id
 * milik akun login — guru tidak pernah melihat data guru lain).
 * Read-only: tanpa tombol Hitung Ulang, tanpa statistik sekolah.
 */
async function TeacherGrowthView() {
  let mine: Awaited<ReturnType<typeof getMyGrowthData>>;
  try {
    mine = await getMyGrowthData();
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Perkembangan"
          title="Teacher Growth"
          description="Perkembangan Anda berdasarkan penilaian, supervisi, dan coaching."
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

  if (!mine) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Perkembangan"
          title="Teacher Growth"
          description="Perkembangan Anda berdasarkan penilaian, supervisi, dan coaching."
        />
        <Empty
          icon={Users}
          title="Akun belum terhubung ke data guru"
          description="Akun Anda belum terhubung ke data guru. Minta Kepala Sekolah memastikan data Anda."
          actionHref="/profil"
          actionLabel="Buka Profil Saya"
        />
      </div>
    );
  }

  const snapshots = mine.snapshots;
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const delta =
    latest?.overall_score != null && previous?.overall_score != null
      ? Math.round((latest.overall_score - previous.overall_score) * 100) / 100
      : null;

  if (!latest) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Perkembangan"
          title="Teacher Growth"
          description="Perkembangan Anda berdasarkan penilaian, supervisi, dan coaching."
        />
        <Empty
          icon={Sprout}
          title="Belum ada data perkembangan"
          description="Skor Anda akan muncul setelah Kepala Sekolah mengisi penilaian atau menyelesaikan supervisi. Selesaikan juga tindak lanjut coaching Anda tepat waktu."
          actionHref="/coaching"
          actionLabel="Lihat Coaching Saya"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Perkembangan"
        title="Teacher Growth"
        description={`Periode ${latest.period} — dihitung dari penilaian Kepala Sekolah, supervisi, dan coaching Anda.`}
        actions={
          delta !== null ? (
            <span
              className={`inline-flex items-center gap-1 text-sm font-semibold ${
                delta >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {delta >= 0 ? (
                <TrendingUp className="h-4 w-4" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4" aria-hidden />
              )}
              <span className="tnum">
                {delta >= 0 ? "+" : ""}
                {delta} dari periode lalu
              </span>
            </span>
          ) : undefined
        }
      />

      <Panel title="Skor Saya">
        <div className="flex items-baseline gap-2">
          <span
            className={`tnum text-4xl font-bold tracking-tight ${scoreColor(latest.overall_score)}`}
          >
            {latest.overall_score ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground">
            skor overall / 100
          </span>
        </div>
        <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {DIMENSIONS.map((d) => {
            const value =
              (latest?.[d.key as keyof typeof latest] as number | null) ??
              null;
            return (
              <div key={d.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className={`tnum font-semibold ${scoreColor(value)}`}>
                    {value ?? "—"}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${d.label}: ${value ?? "belum ada data"}`}
                >
                  <div
                    className={`h-full rounded-full ${scoreBg(value)}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Tren Skor Saya"
        description="Perkembangan skor overall dan tiap dimensi per periode"
      >
        <GrowthChart
          data={snapshots.map((s) => ({
            period: s.period,
            overall: s.overall_score,
            pedagogic: s.pedagogic_score,
            professional: s.professional_score,
            social: null,
            personality: null,
            digital: null,
            assessment: s.assessment_score,
            classroom: s.classroom_score,
          }))}
        />
      </Panel>
    </div>
  );
}
