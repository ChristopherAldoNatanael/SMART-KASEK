import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeacherById } from "@/services/teacher.service";
import {
  getCompetencies,
  getTeacherCompetencySummary,
} from "@/services/competency.service";
import {
  getLatestGrowthSnapshot,
  calculateGrowthPercentage,
} from "@/services/growth.service";
import { getTeacherSupervisions } from "@/services/supervision.service";
import { getTeacherCoachingSessions } from "@/services/coaching.service";
import { Badge, PageHeader, Panel } from "@/components/common";
import CompetencyForm, {
  TeacherProfileForm,
  TeachingForm,
} from "@/components/teachers/competency-form";

const SUPERVISION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  completed: "Selesai",
  follow_up: "Tindak Lanjut",
  closed: "Ditutup",
};

const COACHING_STATUS_LABELS: Record<string, string> = {
  scheduled: "Terjadwal",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

/** Label sumber skor kompetensi — setiap angka wajib punya jejak. */
const COMPETENCY_SOURCE_LABELS: Record<string, string> = {
  supervision: "Supervisi",
  self_assessment: "Penilaian Diri",
  coaching: "Coaching",
  assessment: "Asesmen",
  manual: "Penilaian Kepala Sekolah",
  ai: "AI",
};

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

  const [
    competencySummary,
    latestGrowth,
    growthPercentage,
    viewer,
    masterCompetencies,
    supervisions,
    coachingSessions,
  ] = await Promise.all([
    getTeacherCompetencySummary(id).catch(() => []),
    getLatestGrowthSnapshot(id).catch(() => null),
    calculateGrowthPercentage(id).catch(() => null),
    getCurrentUser().catch(() => null),
    getCompetencies().catch(() => []),
    getTeacherSupervisions(id).catch(() => []),
    getTeacherCoachingSessions(id).catch(() => []),
  ]);

  const canScore =
    viewer !== null && hasRole(viewer.role, "principal");
  const canEditProfile =
    canScore ||
    (viewer?.role === "teacher" &&
      teacher.profile_id !== null &&
      teacher.profile_id === viewer.id);

  // Opsi form diambil dari master kompetensi (bukan dari ringkasan),
  // agar Kepala Sekolah tetap bisa mengisi nilai pertama walaupun
  // guru ini belum punya satu pun skor.
  const latestScoreById = new Map(
    competencySummary.map((c) => [c.competencyId, c.latestScore])
  );
  const competencyOptions = masterCompetencies.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    latestScore: latestScoreById.get(c.id) ?? null,
  }));

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
        description={`NIP ${teacher.nip ?? "—"} • NUPTK ${teacher.employee_number ?? "—"}${teacher.homeroom_class ? ` • Wali Kelas ${teacher.homeroom_class}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={teacher.profile?.is_active ? "success" : "neutral"}>
              {teacher.profile?.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
            {canScore && (
              <>
                <Link
                  href={`/supervision/new?teacherId=${id}`}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Buat Supervisi
                </Link>
                <Link
                  href={`/coaching/new?teacherId=${id}`}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Buat Coaching
                </Link>
              </>
            )}
          </div>
        }
      />

      <Panel
        title="Penugasan Mengajar"
        description="Mata pelajaran dan status Wali Kelas — satu sumber data dengan tabel guru"
        action={
          teacher.homeroom_class ? (
            <Badge tone="brand">Wali Kelas {teacher.homeroom_class}</Badge>
          ) : (
            <Badge tone="neutral">Bukan Wali Kelas</Badge>
          )
        }
      >
        {canScore ? (
          <div className="space-y-6">
            <TeachingForm
              teacherId={id}
              subject={teacher.subject}
              homeroomClass={teacher.homeroom_class}
              nip={teacher.nip}
            />
            <div className="border-t pt-5">
              <h3 className="mb-3 text-sm font-semibold">Data Pokok</h3>
              <TeacherProfileForm
                teacherId={id}
                fullName={teacher.profile?.full_name ?? ""}
                employeeNumber={teacher.employee_number}
                department={teacher.department}
                educationLevel={teacher.education_level}
                employmentStatus={teacher.employment_status}
                joinedAt={teacher.joined_at}
              />
            </div>
          </div>
        ) : canEditProfile ? (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              Penugasan mengajar ditentukan Kepala Sekolah. Data pokok di bawah
              dapat Anda perbarui sendiri.
            </p>
            <TeacherProfileForm
              teacherId={id}
              fullName={teacher.profile?.full_name ?? ""}
              employeeNumber={teacher.employee_number}
              department={teacher.department}
              educationLevel={teacher.education_level}
              employmentStatus={teacher.employment_status}
              joinedAt={teacher.joined_at}
            />
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Mata Pelajaran</dt>
              <dd className="mt-0.5 font-medium">{teacher.subject ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Wali Kelas</dt>
              <dd className="mt-0.5 font-medium">
                {teacher.homeroom_class ?? "—"}
              </dd>
            </div>
          </dl>
        )}
      </Panel>

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
            Belum ada snapshot perkembangan. Snapshot terhitung otomatis
            setelah ada data kompetensi — isi nilai kompetensi di bawah
            atau selesaikan penilaian supervisi, maka profil ini terisi
            sendiri.
          </p>
        )}
      </Panel>

      <Panel
        title="Kompetensi Terkini"
        description="Skor terakhir per kompetensi — setiap angka tercatat sumber dan tanggalnya"
      >        {competencySummary.length > 0 ? (
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
                    {item.latestScore !== null && (
                      <>
                        {" • "}
                        {item.source
                          ? (COMPETENCY_SOURCE_LABELS[item.source] ?? item.source)
                          : "—"}
                        {item.assessedAt &&
                          ` • ${formatShortDate(item.assessedAt)}`}
                      </>
                    )}
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

        {canScore && competencyOptions.length > 0 && (
          <div className="mt-5 border-t pt-5">
            <h3 className="text-sm font-semibold">Penilaian Kepala Sekolah</h3>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">
              Untuk dimensi yang belum terisi otomatis (Sosial, Kepribadian,
              Digital): nilai dari observasi langsung Anda. Dasar penilaian
              wajib diisi sebagai bukti. Menyimpan langsung memperbarui
              profil perkembangan di atas.
            </p>
            <CompetencyForm
              teacherId={id}
              competencies={competencyOptions}
            />
          </div>
        )}
        {canScore && competencyOptions.length === 0 && (
          <p className="mt-5 border-t pt-5 text-sm text-amber-700">
            Master kompetensi belum tersedia — jalankan migrasi
            00020_master_competencies di database agar nilai dapat diisi.
          </p>
        )}
      </Panel>

      <Panel
        title="Riwayat Supervisi"
        description={
          supervisions.length > 0
            ? `${supervisions.length} supervisi tercatat untuk guru ini`
            : undefined
        }
      >
        {supervisions.length > 0 ? (
          <ul className="divide-y">
            {supervisions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/supervision/${s.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    Supervisi {formatShortDate(s.supervision_date)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {s.type ?? "Supervisi"} •{" "}
                    {SUPERVISION_STATUS_LABELS[s.status] ?? s.status}
                  </p>
                </div>
                <span className="tnum shrink-0 text-lg font-bold">
                  {s.overall_score ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada supervisi untuk guru ini.
          </p>
        )}
      </Panel>

      <Panel
        title="Riwayat Coaching"
        description={
          coachingSessions.length > 0
            ? `${coachingSessions.length} sesi coaching tercatat untuk guru ini`
            : undefined
        }
      >
        {coachingSessions.length > 0 ? (
          <ul className="divide-y">
            {coachingSessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/coaching/${s.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {s.focus_area ?? "Coaching"}{" "}
                    • {formatShortDate(s.session_date)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {COACHING_STATUS_LABELS[s.status] ?? s.status}
                  </p>
                </div>
                <Badge
                  tone={s.status === "completed" ? "success" : "neutral"}
                >
                  {COACHING_STATUS_LABELS[s.status] ?? s.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada coaching untuk guru ini.
          </p>
        )}
      </Panel>
    </div>
  );
}
