import Link from "next/link";
import { TrendingDown, TrendingUp, UserRound } from "lucide-react";
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
  { label: "Manajemen Kelas", key: "classroom_score" },
] as const;

const COACHING_LABELS: Record<string, string> = {
  scheduled: "Terjadwal",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

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

      <Panel
        title="Perkembangan Saya"
        description={
          latest
            ? `Periode ${latest.period} — dihitung dari data penilaian Anda`
            : undefined
        }
        action={
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
                {delta}
              </span>
            </span>
          ) : undefined
        }
      >
        {latest ? (
          <div className="space-y-5">
            <div className="flex items-baseline gap-2">
              <span className="tnum text-4xl font-bold tracking-tight">
                {latest.overall_score ?? "—"}
              </span>
              <span className="text-sm text-muted-foreground">
                skor overall / 100
              </span>
            </div>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {DIMENSIONS.map((item) => {
                const score = (latest?.[
                  item.key as keyof typeof latest
                ] as number | null) ?? null;
                return (
                  <div key={item.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="tnum font-semibold">{score ?? "—"}</span>
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
            Belum ada snapshot perkembangan. Nilai akan muncul setelah Kepala
            Sekolah menginput penilaian kompetensi Anda.
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Supervisi Saya" description="10 terakhir">
          {supervisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada supervisi tercatat.
            </p>
          ) : (
            <ul className="divide-y">
              {supervisions.map((s) => (
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

        <Panel title="Coaching Saya" description="10 terakhir">
          {coachings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada sesi coaching.{" "}
              <Link href="/coaching" className="font-medium text-brand hover:underline">
                Lihat Coaching
              </Link>
            </p>
          ) : (
            <ul className="divide-y">
              {coachings.map((c) => (
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
                      })}{" "}
                      • {c.completedActions}/{c.completedActions + c.pendingActions} tindakan selesai
                    </p>
                  </div>
                  <Badge tone={c.status === "completed" ? "success" : "info"}>
                    {COACHING_LABELS[c.status] ?? c.status}
                  </Badge>
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
                <span className="tnum shrink-0 text-lg font-bold">
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
