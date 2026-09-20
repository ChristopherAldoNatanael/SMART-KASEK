import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  MessagesSquare,
  School,
  Sprout,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Eye,
  BookOpen,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  getMySchoolInviteCode,
  getOnboardingState,
} from "@/services/school.service";
import { getSchoolGrowthOverview } from "@/services/growth.service";
import { getCoachingStats } from "@/services/coaching.service";
import { getSupervisionStats } from "@/services/supervision.service";
import { getCachedSchoolInsight } from "@/services/ai.service";
import AISchoolInsight from "@/components/dashboard/ai-school-insight";
import { getPromotionStats } from "@/services/promotion.service";
import { getProgramSummary } from "@/services/program.service";
import { getStudentListMeta } from "@/services/student.service";
import { getActiveSchoolClassNames } from "@/services/school-class.service";
import { getMyTeacher } from "@/services/teacher.service";
import {
  getMyAssignments,
  getTeacherClassAccess,
} from "@/services/teaching-assignment.service";
import { getAttendanceSheet } from "@/services/student-attendance.service";
import { currentSemester, semesterLabel } from "@/lib/programs";
import {
  allowedClassesFor,
  currentAcademicYear,
  todayISO,
} from "@/lib/students";
import { getMyProfileData } from "@/services/profile.service";
import { Empty, PageHeader, Panel, Stat } from "@/components/common";
import InviteCodeCard from "@/components/school/invite-code-card";
import { GrowthChart } from "@/components/charts/growth-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarChart } from "@/components/charts/bar-chart";

export const dynamic = "force-dynamic";

function Shortcut({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all hover:border-brand/40 hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent ?? "bg-brand/10 text-brand"}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
        aria-hidden
      />
    </Link>
  );
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-700";
  if (score >= 70) return "text-foreground";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

export default async function DashboardPage() {
  const state = await getOnboardingState();

  if (state.status === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Ringkasan kondisi sekolah hari ini"
        />
        <Empty
          icon={AlertTriangle}
          title="Gagal memuat data sekolah"
          description={`${state.message}. Periksa koneksi Anda lalu muat ulang halaman.`}
          actionHref="/dashboard"
          actionLabel="Muat Ulang"
        />
      </div>
    );
  }

  if (state.status !== "ready") {
    redirect("/onboarding");
  }

  const user = await getCurrentUser();
  const isLeader =
    user !== null && user.schoolId !== null && hasRole(user.role, "principal");

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : "Selamat sore";

  // ─── Teacher Dashboard ────────────────────────────────────────────
  if (!isLeader) {
    let profileData = null;
    try {
      profileData = await getMyProfileData();
    } catch {
      // ignore
    }

    const latest = profileData?.snapshots?.length
      ? profileData.snapshots[profileData.snapshots.length - 1]
      : null;
    const previous =
      profileData?.snapshots && profileData.snapshots.length > 1
        ? profileData.snapshots[profileData.snapshots.length - 2]
        : null;
    const delta =
      latest?.overall_score != null && previous?.overall_score != null
        ? Math.round((latest.overall_score - previous.overall_score) * 100) /
          100
        : null;

    const activeCoachings =
      profileData?.coachings?.filter(
        (c) => c.status === "in_progress" || c.status === "scheduled"
      ) ?? [];
    const completedCoachings =
      profileData?.coachings?.filter((c) => c.status === "completed") ?? [];
    const recentSupervisions = profileData?.supervisions?.slice(0, 3) ?? [];

    // Kelas yang diampu: wali (absensi hari ini) + mapel (daftar ajar).
    // Gagal diam-diam — bagian ini pelengkap, bukan penentu halaman.
    let homeroomCard: {
      className: string;
      year: string;
      total: number;
      filled: number;
    } | null = null;
    let taughtClasses: { className: string; subject: string }[] = [];
    try {
      const [myTeacher, assignments, access] = await Promise.all([
        getMyTeacher().catch(() => null),
        getMyAssignments().catch(() => []),
        getTeacherClassAccess().catch(() => null),
      ]);
      const year = currentAcademicYear();
      taughtClasses = assignments
        .filter((a) => a.academic_year === year && a.class_name.trim() !== "")
        .map((a) => ({ className: a.class_name, subject: a.subject }));
      const homeroom = (myTeacher?.homeroom_class ?? "").trim() || null;
      if (homeroom) {
        const sheet = await getAttendanceSheet({
          academicYear: year,
          className: homeroom,
          date: todayISO(),
          allowedClasses: allowedClassesFor(access, year),
        }).catch(() => null);
        if (sheet) {
          homeroomCard = {
            className: homeroom,
            year,
            total: sheet.rows.length,
            filled: sheet.filled,
          };
        }
      }
    } catch {
      homeroomCard = null;
      taughtClasses = [];
    }

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={profileData?.teacher?.subject ?? "Guru"}
          title={`${greeting}${user?.fullName ? `, ${user.fullName}` : ""}`}
          description="Pantau kelas, absensi, perkembangan, dan tindak lanjut Anda."
        />

        {/* Wali kelas: absensi hari ini */}
        {homeroomCard && (
          <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  Wali Kelas {homeroomCard.className}
                </p>
                <p className="tnum mt-1 text-2xl font-bold">
                  {homeroomCard.filled}/{homeroomCard.total}{" "}
                  <span className="text-sm font-medium text-muted-foreground">
                    absensi hari ini
                  </span>
                </p>
              </div>
              <Link
                href={`/students/absensi?tahun=${encodeURIComponent(homeroomCard.year)}&kelas=${encodeURIComponent(homeroomCard.className)}`}
                className="inline-flex min-h-[48px] items-center rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Isi absensi
              </Link>
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={homeroomCard.filled}
              aria-valuemin={0}
              aria-valuemax={Math.max(homeroomCard.total, 1)}
              aria-label={`Absensi Kelas ${homeroomCard.className} hari ini`}
            >
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{
                  width: `${
                    homeroomCard.total > 0
                      ? Math.round((homeroomCard.filled / homeroomCard.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {homeroomCard.total - homeroomCard.filled > 0
                ? `${homeroomCard.total - homeroomCard.filled} anak belum tercatat.`
                : "Semua anak sudah tercatat hari ini."}
            </p>
          </div>
        )}

        {/* Guru mapel: kelas yang diajar */}
        {taughtClasses.length > 0 && (
          <Panel
            title="Kelas yang saya ajar"
            description="Jalan pintas absensi tiap kelas."
          >
            <ul className="divide-y">
              {taughtClasses.map((c) => (
                <li
                  key={`${c.className}-${c.subject}`}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">
                      Kelas {c.className}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.subject || "Tanpa mapel"}
                    </p>
                  </div>
                  <Link
                    href={`/students/absensi?tahun=${encodeURIComponent(currentAcademicYear())}&kelas=${encodeURIComponent(c.className)}`}
                    className="shrink-0 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    Absensi
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Growth Score Card */}
        {latest ? (
          <div className="rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Skor Perkembangan
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${scoreColor(latest.overall_score)}`}
                  >
                    {latest.overall_score ?? "—"}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Periode {latest.period}
                </p>
              </div>
              {delta !== null && (
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 ${delta >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}
                >
                  {delta >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                  )}
                  <span
                    className={`text-sm font-semibold ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta}
                  </span>
                </div>
              )}
            </div>
            {/* Mini dimension bars */}
            {latest && (
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {[
                  { label: "Pedagogik", key: "pedagogic_score" },
                  { label: "Profesional", key: "professional_score" },
                  { label: "Asesmen", key: "assessment_score" },
                  { label: "Man. Kelas", key: "classroom_score" },
                ].map((d) => {
                  const val =
                    (latest[d.key as keyof typeof latest] as number | null) ??
                    null;
                  return (
                    <div key={d.key}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">
                          {d.label}
                        </span>
                        <span className="font-medium">{val ?? "—"}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${Math.min(100, Math.max(0, val ?? 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link
              href="/profil"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Lihat profil lengkap
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <Sprout className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 font-medium">Belum ada data perkembangan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Skor akan muncul setelah Kepala Sekolah menginput penilaian
              kompetensi atau Anda menyelesaikan tindak lanjut coaching.
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeCoachings.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Coaching Aktif
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {completedCoachings.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Coaching Selesai
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {profileData?.supervisions?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Supervisi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Active Coachings */}
          <Panel title="Tindak Lanjut Aktif">
            {activeCoachings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada tindak lanjut aktif.
              </p>
            ) : (
              <ul className="divide-y">
                {activeCoachings.slice(0, 3).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.focus_area ?? "Sesi coaching"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.session_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        &middot;{" "}
                        {c.completedActions}/
                        {c.completedActions + c.pendingActions} selesai
                      </p>
                    </div>
                    <Link
                      href={`/coaching/${c.id}`}
                      className="shrink-0 text-sm font-medium text-brand hover:underline"
                    >
                      Buka
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {activeCoachings.length > 0 && (
              <Link
                href="/coaching"
                className="mt-3 flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                Lihat semua coaching
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </Panel>

          {/* Recent Supervisions */}
          <Panel title="Supervisi Terakhir">
            {recentSupervisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada supervisi.
              </p>
            ) : (
              <ul className="divide-y">
                {recentSupervisions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(s.supervision_date).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
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

        {/* Shortcuts */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Shortcut
            href="/coaching"
            icon={MessagesSquare}
            title="Coaching"
            description="Tindak lanjut dan laporan"
            accent="bg-blue-100 text-blue-600"
          />
          <Shortcut
            href="/supervision"
            icon={Eye}
            title="Supervisi"
            description="Hasil supervisi Anda"
            accent="bg-violet-100 text-violet-600"
          />
          <Shortcut
            href="/learning"
            icon={BookOpen}
            title="Modul Ajar"
            description="Perangkat pembelajaran"
            accent="bg-amber-100 text-amber-600"
          />
        </div>
      </div>
    );
  }

  // ─── Principal Dashboard ──────────────────────────────────────────
  let stats: {
    teacherCount: number;
    averageGrowth: number | null;
    positiveGrowth: number;
    attentionCount: number;
    pendingCoaching: number;
    overdueActions: number;
    completedActions: number;
    totalActions: number;
    supervisionCompleted: number;
    supervisionTotal: number;
    supervisionDraft: number;
    supervisionFollowUp: number;
    supervisionClosed: number;
    coachingTotal: number;
  } | null = null;
  let inviteCode: string | null = null;
  let loadError: string | null = null;
  let trendData: { period: string; average: number | null }[] = [];

  let schoolSize: {
    students: number;
    male: number;
    female: number;
    classes: number;
    perClass: { name: string; total: number }[];
  } | null = null;

  try {
    const [overview, coaching, supervision, code, studentMeta, classNames] =
      await Promise.all([
        getSchoolGrowthOverview(),
        getCoachingStats(),
        getSupervisionStats(),
        getMySchoolInviteCode(),
        getStudentListMeta(currentAcademicYear()).catch(() => null),
        getActiveSchoolClassNames().catch(() => [] as string[]),
      ]);
    schoolSize = studentMeta
      ? {
          students: studentMeta.stats.total,
          male: studentMeta.stats.male,
          female: studentMeta.stats.female,
          classes: classNames.length,
          perClass: studentMeta.classCounts
            .filter((c) => (c.name ?? "") !== "")
            .map((c) => ({ name: c.name ?? "Tanpa kelas", total: c.total })),
        }
      : {
          students: 0,
          male: 0,
          female: 0,
          classes: classNames.length,
          perClass: [],
        };
    stats = {
      teacherCount: overview.teacherCount,
      averageGrowth: overview.averageOverall,
      positiveGrowth: overview.positiveCount,
      attentionCount: overview.attentionCount,
      pendingCoaching: coaching.pendingActions,
      overdueActions: coaching.overdueActions,
      completedActions: coaching.completedActions,
      totalActions: coaching.totalActions,
      supervisionCompleted: supervision.completed,
      supervisionTotal: supervision.total,
      supervisionDraft: supervision.draft,
      supervisionFollowUp: supervision.followUp,
      supervisionClosed: supervision.closed,
      coachingTotal: coaching.totalSessions,
    };
    inviteCode = code;
    trendData = overview.trend;
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Gagal memuat data dashboard";
  }

  // Insight tersimpan saja (tanpa memanggil AI) agar dashboard tetap cepat.
  const cachedSchoolInsight = await getCachedSchoolInsight().catch(() => null);

  // Strip Kenaikan Kelas: terpisah agar aman bila tabel belum ada
  // (migrasi belum dijalankan) — gagal diam-diam, dashboard tetap jalan.
  let promotionSummary: {
    total: number;
    submitted: number;
    decided: number;
  } | null = null;
  try {
    const promotionStats = await getPromotionStats(currentAcademicYear());
    if (promotionStats.total > 0) {
      promotionSummary = {
        total: promotionStats.total,
        submitted: promotionStats.submitted,
        decided: promotionStats.decided,
      };
    }
  } catch {
    promotionSummary = null;
  }

  // Ringkasan Program Sekolah semester berjalan: gagal diam-diam bila
  // tidak ada akses/data.
  const programSemester = currentSemester();
  const programYear = currentAcademicYear();
  let programSummary: Awaited<ReturnType<typeof getProgramSummary>> | null =
    null;
  try {
    const summary = await getProgramSummary({
      semester: programSemester,
      academicYear: programYear,
    });
    if (summary.programs.length > 0) programSummary = summary;
  } catch {
    programSummary = null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={state.school.name}
        title={`${greeting}${user?.fullName ? `, ${user.fullName}` : ""}`}
        description="Kondisi sekolah hari ini — semua angka dari data nyata."
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {stats && (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat
              icon={GraduationCap}
              label="Total Siswa"
              value={schoolSize?.students ?? "—"}
              accent="bg-blue-100 text-blue-700"
              sub={
                schoolSize
                  ? `${schoolSize.male} laki-laki • ${schoolSize.female} perempuan`
                  : "Belum ada data"
              }
            />
            <Stat
              icon={Users}
              label="Total Guru"
              value={stats.teacherCount}
              accent="bg-violet-100 text-violet-700"
              sub={`${stats.positiveGrowth} tumbuh positif`}
            />
            <Stat
              icon={School}
              label="Total Kelas"
              value={schoolSize?.classes ?? "—"}
              accent="bg-amber-100 text-amber-700"
              sub="Kelas aktif tahun ini"
            />
            <Stat
              icon={LineChart}
              label="Rata-rata Growth"
              value={
                stats.averageGrowth !== null
                  ? `${stats.averageGrowth}`
                  : "—"
              }
              sub={
                stats.attentionCount > 0
                  ? `${stats.attentionCount} perlu perhatian`
                  : "Semua dalam batas"
              }
              tone={stats.attentionCount > 0 ? "danger" : "brand"}
            />
            <Stat
              icon={ClipboardCheck}
              label="Tindak Lanjut"
              value={stats.completedActions}
              sub={
                stats.overdueActions > 0
                  ? `${stats.overdueActions} terlambat`
                  : `${stats.pendingCoaching} menunggu`
              }
              tone={stats.overdueActions > 0 ? "danger" : "default"}
            />
            <Stat
              icon={MessagesSquare}
              label="Coaching"
              value={stats.coachingTotal}
              accent="bg-cyan-100 text-cyan-700"
              sub={`Supervisi ${stats.supervisionCompleted}/${stats.supervisionTotal}`}
            />
          </div>

          {/* Grafik kesiswaan */}
          {schoolSize && schoolSize.students > 0 && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel
                title="Siswa per Kelas"
                description="Jumlah siswa tiap kelas tahun ini"
                className="lg:col-span-2"
              >
                <BarChart
                  data={schoolSize.perClass.map((c) => ({
                    name: c.name,
                    value: c.total,
                  }))}
                  height={210}
                  maxValue={Math.max(
                    ...schoolSize.perClass.map((c) => c.total),
                    1
                  )}
                />
              </Panel>
              <Panel title="Laki-laki • Perempuan">
                <DonutChart
                  data={[
                    { name: "Laki-laki", value: schoolSize.male, color: "#2563eb" },
                    { name: "Perempuan", value: schoolSize.female, color: "#e11d48" },
                  ].filter((d) => d.value > 0)}
                  height={170}
                />
                <div className="mt-3 flex justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    Laki-laki {schoolSize.male}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                    Perempuan {schoolSize.female}
                  </span>
                </div>
              </Panel>
            </div>
          )}

          {promotionSummary && (
            <Link
              href="/kenaikan-kelas"
              className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-primary/50"
            >
              <span className="font-bold">Kenaikan Kelas</span>
              <span className="flex items-baseline gap-2">
                <span className="text-muted-foreground">Total Siswa</span>
                <span className="tnum text-lg font-bold">{promotionSummary.total}</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-muted-foreground">Menunggu Verifikasi</span>
                <span className="tnum text-lg font-bold">{promotionSummary.submitted}</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-muted-foreground">Ditetapkan</span>
                <span className="tnum text-lg font-bold">{promotionSummary.decided}</span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1 font-medium text-brand">
                Buka <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          )}

          {programSummary && (
            <Panel
              title={`Program Sekolah — ${semesterLabel(programSemester)} ${programYear}`}
              description="Rata-rata jalannya kegiatan semester ini (yang batal tidak dihitung)."
              action={
                <Link
                  href="/programs"
                  className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-brand hover:underline"
                >
                  Kelola program
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              }
            >
              <div className="grid gap-6 lg:grid-cols-[220px_1fr_1fr]">
                <div className="flex flex-col justify-center">
                  <p className="text-sm text-muted-foreground">Rata-rata jalan</p>
                  <p className="tnum text-5xl font-bold">
                    {programSummary.overall !== null ? `${programSummary.overall}%` : "—"}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {programSummary.counts.completed} dari{" "}
                    {programSummary.programs.length - programSummary.counts.cancelled}{" "}
                    program terlaksana
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {programSummary.counts.ongoing} berjalan •{" "}
                    {programSummary.counts.planned} rencana
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Keadaan kegiatan</p>
                  <DonutChart
                    data={[
                      { name: "Berjalan", value: programSummary.counts.ongoing, color: "#d97706" },
                      { name: "Rencana", value: programSummary.counts.planned, color: "#2563eb" },
                      { name: "Selesai", value: programSummary.counts.completed, color: "#059669" },
                      ...(programSummary.counts.cancelled > 0
                        ? [{ name: "Batal", value: programSummary.counts.cancelled, color: "#94a3b8" }]
                        : []),
                    ].filter((d) => d.value > 0)}
                    height={190}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Jalannya tiap kegiatan</p>
                  <BarChart
                    data={programSummary.programs
                      .filter((p) => p.progress !== null)
                      .slice(0, 6)
                      .map((p) => ({
                        name:
                          p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name,
                        value: p.progress ?? 0,
                        color: p.status === "completed" ? "#059669" : "#2563eb",
                      }))}
                    height={190}
                    maxValue={100}
                  />
                </div>
              </div>
            </Panel>
          )}

          <Panel
            title="AI School Insight"
            description="Ringkasan kondisi sekolah dari angka ringkasan. Tidak menilai individu."
          >
            <AISchoolInsight initial={cachedSchoolInsight} />
          </Panel>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Growth Trend Chart */}
            <Panel
              title="Tren Pertumbuhan"
              description="Rata-rata skor per periode"
              className="lg:col-span-2"
            >
              <GrowthChart
                data={trendData.map((t) => ({
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
                height={250}
              />
            </Panel>

            {/* Coaching Donut */}
            <Panel title="Status Coaching">
              <DonutChart
                data={[
                  {
                    name: "Selesai",
                    value: stats.completedActions,
                    color: "#059669",
                  },
                  {
                    name: "Menunggu",
                    value: stats.pendingCoaching,
                    color: "#d97706",
                  },
                  {
                    name: "Terlambat",
                    value: stats.overdueActions,
                    color: "#be123c",
                  },
                ].filter((d) => d.value > 0)}
                height={200}
              />
              <div className="mt-3 flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  Selesai
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Menunggu
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                  Terlambat
                </span>
              </div>
            </Panel>
          </div>

          {/* Supervision Breakdown + Quick Actions */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Supervision Bar Chart */}
            <Panel
              title="Status Supervisi"
              description="Distribusi status supervisi"
            >
              <BarChart
                data={[
                  {
                    name: "Draft",
                    value: stats.supervisionDraft,
                    color: "#94a3b8",
                  },
                  {
                    name: "Selesai",
                    value: stats.supervisionCompleted,
                    color: "#059669",
                  },
                  {
                    name: "Tindak Lanjut",
                    value: stats.supervisionFollowUp,
                    color: "#d97706",
                  },
                  {
                    name: "Ditutup",
                    value: stats.supervisionClosed,
                    color: "#2563eb",
                  },
                ]}
                height={200}
                maxValue={Math.max(
                  stats.supervisionDraft,
                  stats.supervisionCompleted,
                  stats.supervisionFollowUp,
                  stats.supervisionClosed,
                  1
                )}
              />
            </Panel>

            {/* Quick Actions */}
            <div className="space-y-3 lg:col-span-2">
              <Shortcut
                href="/supervision"
                icon={Eye}
                title="Supervisi"
                description={`${stats.supervisionCompleted} dari ${stats.supervisionTotal} selesai. ${stats.supervisionFollowUp > 0 ? `${stats.supervisionFollowUp} perlu tindak lanjut.` : ""}`}
                accent="bg-violet-100 text-violet-600"
              />
              <Shortcut
                href="/coaching"
                icon={MessagesSquare}
                title="Coaching"
                description={
                  stats.pendingCoaching === 0
                    ? "Semua tindak lanjut selesai."
                    : `${stats.pendingCoaching} tindak lanjut menunggu. ${stats.overdueActions > 0 ? `${stats.overdueActions} terlambat.` : ""}`
                }
                accent="bg-blue-100 text-blue-600"
              />
              <Shortcut
                href="/growth"
                icon={Sprout}
                title="Teacher Growth"
                description={
                  stats.averageGrowth !== null
                    ? `Rata-rata ${stats.averageGrowth} — ${stats.positiveGrowth} guru tumbuh positif.`
                    : "Belum ada data perkembangan."
                }
                accent="bg-emerald-100 text-emerald-600"
              />
              <Shortcut
                href="/teachers"
                icon={Users}
                title="Data Guru"
                description={`${stats.teacherCount} guru terdaftar. Kelola data dan kompetensi.`}
                accent="bg-slate-100 text-slate-600"
              />
              <Shortcut
                href="/programs"
                icon={Target}
                title="Program Sekolah"
                description={
                  programSummary && programSummary.overall !== null
                    ? `Rata-rata sudah jalan ${programSummary.overall}% dari ${programSummary.programs.length} kegiatan.`
                    : "Tambah dan pantau kegiatan sekolah."
                }
                accent="bg-cyan-100 text-cyan-600"
              />
            </div>
          </div>

          {/* Invite Code */}
          <InviteCodeCard code={inviteCode} />
        </>
      )}
    </div>
  );
}
