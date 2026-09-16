import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  UserRound,
  Sprout,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyProfileData } from "@/services/profile.service";
import { Badge, Empty, PageHeader, Panel } from "@/components/common";
import { TeacherProfileForm } from "@/components/teachers/competency-form";

export const dynamic = "force-dynamic";

const DIMENSIONS = [
  { label: "Pedagogik", key: "pedagogic_score" },
  { label: "Profesional", key: "professional_score" },
  { label: "Sosial", key: "social_score" },
  { label: "Kepribadian", key: "personality_score" },
  { label: "Digital", key: "digital_score" },
  { label: "Asesmen", key: "assessment_score" },
  { label: "Man. Kelas", key: "classroom_score" },
] as const;

const COACHING_LABELS: Record<string, string> = {
  scheduled: "Terjadwal",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

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

function scoreLabel(score: number | null): string {
  if (score === null) return "";
  if (score >= 85) return "Sangat Baik";
  if (score >= 70) return "Baik";
  if (score >= 60) return "Cukup";
  return "Perlu Perhatian";
}

export default async function MyProfilePage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profil Saya" description="Data kepegawaian dan perkembangan Anda" />
        <Empty
          icon={UserRound}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda terlebih dahulu."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof getMyProfileData>>;
  try {
    data = await getMyProfileData();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profil Saya" description="Data kepegawaian dan perkembangan Anda" />
        <Empty
          icon={UserRound}
          title="Data guru belum terhubung"
          description="Akun Anda sudah tergabung sekolah, tetapi belum terhubung ke data guru. Minta Kepala Sekolah memastikan data Anda."
        />
      </div>
    );
  }

  const { teacher, competencies, snapshots, supervisions, coachings } = data;
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const delta =
    latest?.overall_score != null && previous?.overall_score != null
      ? Math.round((latest.overall_score - previous.overall_score) * 100) / 100
      : null;

  const completedCoachings = coachings.filter((c) => c.status === "completed").length;
  const activeCoachings = coachings.filter(
    (c) => c.status === "in_progress" || c.status === "scheduled"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={teacher.subject ?? "Guru"}
        title={teacher.profile?.full_name ?? "Profil Saya"}
        description={`NIP ${teacher.nip ?? "—"}${teacher.homeroom_class ? ` • Wali Kelas ${teacher.homeroom_class}` : ""}`}
        actions={
          teacher.homeroom_class ? (
            <Badge tone="brand">Wali Kelas {teacher.homeroom_class}</Badge>
          ) : (
            <Badge tone={teacher.profile?.is_active ? "success" : "neutral"}>
              {teacher.profile?.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          )
        }
      />

      <Panel
        title="Penugasan Mengajar"
        description="Mata pelajaran dan status Wali Kelas"
        action={
          teacher.homeroom_class ? (
            <Badge tone="brand">Wali Kelas {teacher.homeroom_class}</Badge>
          ) : (
            <Badge tone="neutral">Bukan Wali Kelas</Badge>
          )
        }
      >
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Mata Pelajaran</dt>
            <dd className="mt-0.5 font-medium">{teacher.subject ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">NIP</dt>
            <dd className="tnum mt-0.5 font-medium">{teacher.nip ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Wali Kelas</dt>
            <dd className="mt-0.5 font-medium">
              {teacher.homeroom_class ?? "—"}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel
        title="Data Pokok"
        description="Data kepegawaian — dapat Anda perbarui sendiri"
      >
        <TeacherProfileForm
          teacherId={teacher.id}
          fullName={teacher.profile?.full_name ?? ""}
          employeeNumber={teacher.employee_number}
          department={teacher.department}
          educationLevel={teacher.education_level}
          employmentStatus={teacher.employment_status}
          joinedAt={teacher.joined_at}
        />
      </Panel>

      {/* Growth Section - Teacher View */}
      <Panel
        title="Perkembangan Saya"
        description={
          latest
            ? `Periode ${latest.period}`
            : undefined
        }
      >
        {latest ? (
          <div className="space-y-6">
            {/* Overall Score with Context */}
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`tnum text-5xl font-bold tracking-tight ${scoreColor(latest.overall_score)}`}>
                    {latest.overall_score ?? "—"}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
                <p className={`mt-1 text-sm font-medium ${scoreColor(latest.overall_score)}`}>
                  {scoreLabel(latest.overall_score)}
                </p>
              </div>
              {delta !== null && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${delta >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                  {delta >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-rose-600" />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {delta >= 0 ? "+" : ""}{delta}
                    </p>
                    <p className="text-xs text-muted-foreground">dari periode lalu</p>
                  </div>
                </div>
              )}
            </div>

            {/* Dimension Bars */}
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {DIMENSIONS.map((item) => {
                const score = (latest?.[
                  item.key as keyof typeof latest
                ] as number | null) ?? null;
                return (
                  <div key={item.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`tnum font-semibold ${scoreColor(score)}`}>
                        {score ?? "—"}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${item.label}: ${score ?? "belum ada data"}`}
                    >
                      <div
                        className={`h-full rounded-full ${scoreBg(score)}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, score ?? 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <Sprout className="h-4 w-4 shrink-0" />
              <p>
                Skor diperbarui otomatis dari data kompetensi dan tindak lanjut coaching yang selesai.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sprout className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Belum ada data perkembangan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Skor akan muncul setelah Kepala Sekolah menginput penilaian kompetensi atau Anda menyelesaikan tindak lanjut coaching.
              </p>
            </div>
          </div>
        )}
      </Panel>

      {/* Coaching & Supervision Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Coaching Saya">
          {coachings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada sesi coaching.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm">
                    <span className="font-semibold">{completedCoachings}</span>{" "}
                    <span className="text-muted-foreground">selesai</span>
                  </span>
                </div>
                {activeCoachings > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">
                      <span className="font-semibold">{activeCoachings}</span>{" "}
                      <span className="text-muted-foreground">aktif</span>
                    </span>
                  </div>
                )}
              </div>
              {/* Recent List */}
              <ul className="divide-y">
                {coachings.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.focus_area ?? "Sesi coaching"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.session_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge tone={c.status === "completed" ? "success" : "info"}>
                      {COACHING_LABELS[c.status] ?? c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
              {coachings.length > 5 && (
                <Link
                  href="/coaching"
                  className="block text-center text-sm font-medium text-brand hover:underline"
                >
                  Lihat semua coaching
                </Link>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Supervisi Saya">
          {supervisions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada supervisi tercatat.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {supervisions.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {new Date(s.supervision_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.strengths ?? s.improvements ?? s.status}
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-lg font-bold">
                    {s.overall_score ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Kompetensi Saya" description="Skor terakhir per kompetensi">
        {competencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada penilaian kompetensi.
          </p>
        ) : (
          <ul className="divide-y">
            {competencies.map((c, i) => (
              <li
                key={`${c.name}-${i}`}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.category}</p>
                </div>
                <span className={`tnum shrink-0 text-lg font-bold ${scoreColor(c.score)}`}>
                  {c.score ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
