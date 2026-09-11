import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeacherById } from "@/services/teacher.service";
import { getTeacherCompetencySummary } from "@/services/competency.service";
import {
  getLatestGrowthSnapshot,
  calculateGrowthPercentage,
} from "@/services/growth.service";
import { Badge, PageHeader, Panel } from "@/components/common";
import CompetencyForm from "@/components/teachers/competency-form";

const DIMENSIONS = [
  { label: "Pedagogik", key: "pedagogic_score" },
  { label: "Profesional", key: "professional_score" },
  { label: "Sosial", key: "social_score" },
  { label: "Kepribadian", key: "personality_score" },
  { label: "Digital", key: "digital_score" },
  { label: "Asesmen", key: "assessment_score" },
  { label: "Manajemen Kelas", key: "classroom_score" },
] as const;

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const teacher = await getTeacherById(id);
  if (!teacher) {
    notFound();
  }

  const [competencySummary, latestGrowth, growthPercentage, viewer] =
    await Promise.all([
      getTeacherCompetencySummary(id).catch(() => []),
      getLatestGrowthSnapshot(id).catch(() => null),
      calculateGrowthPercentage(id).catch(() => null),
      getCurrentUser().catch(() => null),
    ]);

  const canScore =
    viewer !== null && hasRole(viewer.role, "principal");

  return (
    <div className="space-y-6">
      <Link
        href="/teachers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Guru
      </Link>

      <PageHeader
        eyebrow={teacher.subject ?? "Guru"}
        title={teacher.profile?.full_name ?? "Tanpa nama"}
        description={`NIP ${teacher.nip ?? "—"} • NUPTK ${teacher.employee_number ?? "—"}`}
        actions={
          <Badge tone={teacher.profile?.is_active ? "success" : "neutral"}>
            {teacher.profile?.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        }
      />

      <Panel
        title="Profil Perkembangan"
        description={
          latestGrowth
            ? `Periode ${latestGrowth.period} — dihitung dari data kompetensi, supervisi, dan coaching`
            : undefined
        }
        action={
          latestGrowth && growthPercentage !== null ? (
            <span
              className={`inline-flex items-center gap-1 text-sm font-semibold ${
                growthPercentage >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {growthPercentage >= 0 ? (
                <TrendingUp className="h-4 w-4" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4" aria-hidden />
              )}
              <span className="tnum">
                {growthPercentage >= 0 ? "+" : ""}
                {growthPercentage}
              </span>
            </span>
          ) : undefined
        }
      >
        {latestGrowth ? (
          <div className="space-y-5">
            <div className="flex items-baseline gap-2">
              <span className="tnum text-4xl font-bold tracking-tight">
                {latestGrowth.overall_score ?? "—"}
              </span>
              <span className="text-sm text-muted-foreground">
                skor overall / 100
              </span>
            </div>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {DIMENSIONS.map((item) => {
                const score = (latestGrowth?.[
                  item.key as keyof typeof latestGrowth
                ] as number | null) ?? null;
                return (
                  <div key={item.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="tnum font-semibold">
                        {score ?? "—"}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${item.label}: ${score ?? "belum ada data"}`}
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{
                          width: `${Math.min(100, Math.max(0, score ?? 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada snapshot perkembangan. Snapshot terhitung otomatis dari
            data kompetensi dan diperbarui setiap tindak lanjut coaching
            selesai.
          </p>
        )}
      </Panel>

      <Panel
        title="Kompetensi Terkini"
        description="Skor terakhir per kompetensi dari berbagai sumber penilaian"
      >
        {competencySummary.length > 0 ? (
          <ul className="divide-y">
            {competencySummary.map((item) => (
              <li
                key={item.competencyId}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category}
                  </p>
                </div>
                <span className="tnum text-lg font-bold">
                  {item.latestScore ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada data kompetensi untuk guru ini.
          </p>
        )}

        {canScore && competencySummary.length > 0 && (
          <div className="mt-5 border-t pt-5">
            <h3 className="text-sm font-semibold">Input Nilai Kompetensi</h3>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Menyimpan nilai langsung memperbarui profil perkembangan di atas.
            </p>
            <CompetencyForm
              teacherId={id}
              competencies={competencySummary.map((c) => ({
                id: c.competencyId,
                name: c.name,
                category: c.category,
                latestScore: c.latestScore,
              }))}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
