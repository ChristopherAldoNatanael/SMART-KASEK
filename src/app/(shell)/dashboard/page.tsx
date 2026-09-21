import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LineChart,
  MessagesSquare,
  School,
  Sparkles,
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
import {
  getPromotionQueue,
  getPromotionStats,
} from "@/services/promotion.service";
import { getProgramSummary } from "@/services/program.service";
import { getLessonSubmissionStats } from "@/services/lesson.service";
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
import { Empty, PageHeader, Panel } from "@/components/common";
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

/* ------------------------- Principal components ------------------------ */

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  href,
  segments,
  barLabel,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent: string;
  href: string;
  segments?: { pct: number; className: string }[];
  barLabel?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all hover:shadow-[0_8px_20px_rgba(16,24,40,0.10)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-muted/60 transition-transform group-hover:scale-125"
      />
      <div className="relative flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <Link
          href={href}
          aria-label={`Buka ${label}`}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-brand"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <p className="tnum relative mt-3 text-[32px] font-bold leading-none tracking-tight">
        {value}
      </p>
      <p className="relative mt-1.5 text-sm font-semibold">{label}</p>
      {sub && (
        <p className="relative mt-0.5 text-xs text-muted-foreground">{sub}</p>
      )}
      {segments && segments.length > 0 && (
        <div
          className="relative mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={barLabel ?? label}
        >
          {segments.map((s, i) => (
            <div
              key={i}
              className={`h-full rounded-full ${s.className}`}
              style={{ width: `${Math.min(100, Math.max(0, s.pct))}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  label,
  sub,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-2xl border bg-card px-3 py-5 text-center shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_8px_20px_rgba(16,24,40,0.10)]"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${accent}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-sm font-bold leading-tight">{label}</span>
      <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
        {sub}
      </span>
    </Link>
  );
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
        {/* ── 1. Hero: sapaan + ringkasan hari ini ─────────── */}
        {(() => {
          const todayLabel = new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const pendingActions = activeCoachings.reduce(
            (sum, c) => sum + c.pendingActions,
            0
          );
          const attendanceMissing =
            homeroomCard && homeroomCard.total - homeroomCard.filled > 0
              ? homeroomCard.total - homeroomCard.filled
              : 0;
          const chips: { label: string; href: string; tone: "warn" | "info" }[] =
            [];
          if (attendanceMissing > 0) {
            chips.push({
              label: `${attendanceMissing} siswa belum diabsen`,
              href: `/students/absensi?tahun=${encodeURIComponent(homeroomCard!.year)}&kelas=${encodeURIComponent(homeroomCard!.className)}`,
              tone: "warn",
            });
          }
          if (pendingActions > 0) {
            chips.push({
              label: `${pendingActions} tindak lanjut menunggu`,
              href: "/coaching",
              tone: "warn",
            });
          }
          return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-emerald-800 to-teal-700 text-white shadow-lg">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-28 right-32 h-56 w-56 rounded-full bg-white/10"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-black/10"
              />
              <div className="relative p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
                  {profileData?.teacher?.subject ?? "Guru"}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {greeting}
                  {user?.fullName ? `, ${user.fullName}` : ""}!
                </h2>
                <p className="mt-1 text-sm capitalize text-emerald-50/90">
                  {todayLabel} — pantau kelas, absensi, perkembangan, dan tindak
                  lanjut Anda.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {chips.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Semua beres hari ini
                    </span>
                  ) : (
                    chips.map((chip) => (
                      <Link
                        key={chip.label}
                        href={chip.href}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            chip.tone === "warn" ? "bg-amber-300" : "bg-emerald-300"
                          }`}
                          aria-hidden
                        />
                        {chip.label}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 2. Sorotan: Pertumbuhan + Modul Ajar ──────────── */}
        {(() => {
          const hasGrowth = latest !== null;
          if (!hasGrowth && taughtClasses.length === 0 && !homeroomCard) {
            return null;
          }
          return (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Skor Pertumbuhan */}
              {hasGrowth ? (
                <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] lg:col-span-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        Skor Perkembangan
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span
                          className={`text-4xl font-bold ${scoreColor(latest!.overall_score)}`}
                        >
                          {latest!.overall_score ?? "—"}
                        </span>
                        <span className="text-muted-foreground">/100</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Periode {latest!.period}
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
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                    {[
                      { label: "Pedagogik", key: "pedagogic_score" },
                      { label: "Profesional", key: "professional_score" },
                      { label: "Asesmen", key: "assessment_score" },
                      { label: "Man. Kelas", key: "classroom_score" },
                    ].map((d) => {
                      const val =
                        (latest![
                          d.key as keyof typeof latest
                        ] as number | null) ?? null;
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
                  <Link
                    href="/profil"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    Lihat profil lengkap
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.05)] lg:col-span-2">
                  <Sprout className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 font-medium">Belum ada data perkembangan</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Skor akan muncul setelah Kepala Sekolah menginput penilaian
                    kompetensi atau Anda menyelesaikan tindak lanjut coaching.
                  </p>
                </div>
              )}

              {/* Absensi + Kelas yang diajar */}
              <div className="space-y-4">
                {homeroomCard && (
                  <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-muted-foreground">
                          Wali Kelas {homeroomCard.className}
                        </p>
                        <p className="tnum mt-1 text-3xl font-bold leading-none">
                          {homeroomCard.filled}
                          <span className="text-base font-medium text-muted-foreground">
                            /{homeroomCard.total}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          absensi hari ini
                        </p>
                      </div>
                      <Link
                        href={`/students/absensi?tahun=${encodeURIComponent(homeroomCard.year)}&kelas=${encodeURIComponent(homeroomCard.className)}`}
                        aria-label="Isi absensi"
                        className="rounded-full bg-brand/10 p-2 text-brand transition-colors hover:bg-brand hover:text-white"
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
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
                              ? Math.round(
                                  (homeroomCard.filled / homeroomCard.total) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {homeroomCard.total - homeroomCard.filled > 0
                        ? `${homeroomCard.total - homeroomCard.filled} anak belum tercatat.`
                        : "Semua anak sudah tercatat hari ini."}
                    </p>
                  </div>
                )}
                {taughtClasses.length > 0 && (
                  <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
                    <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
                      Kelas yang saya ajar
                    </p>
                    <ul className="divide-y">
                      {taughtClasses.slice(0, 4).map((c) => (
                        <li
                          key={`${c.className}-${c.subject}`}
                          className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              Kelas {c.className}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.subject || "Tanpa mapel"}
                            </p>
                          </div>
                          <Link
                            href={`/students/absensi?tahun=${encodeURIComponent(currentAcademicYear())}&kelas=${encodeURIComponent(c.className)}`}
                            className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-muted"
                          >
                            Absensi
                          </Link>
                        </li>
                      ))}
                      {taughtClasses.length > 4 && (
                        <li className="pt-2 text-center">
                          <Link
                            href="/learning"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                          >
                            Lihat {taughtClasses.length - 4} kelas lainnya
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── 3. Angka Kunci (saya) ─────────────────────────── */}
        <div>
          <div className="mb-3 flex items-end justify-between">
            <h3 className="font-bold">Aktivitas Saya</h3>
            <Link
              href="/profil"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Lihat profil lengkap
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi
              icon={MessagesSquare}
              label="Coaching Aktif"
              value={activeCoachings.length}
              sub={
                activeCoachings.reduce((s, c) => s + c.pendingActions, 0) > 0
                  ? `${activeCoachings.reduce((s, c) => s + c.pendingActions, 0)} tindakan menunggu`
                  : "Tidak ada tindakan menunggu"
              }
              accent="bg-blue-100 text-blue-700"
              href="/coaching"
            />
            <Kpi
              icon={ClipboardCheck}
              label="Coaching Selesai"
              value={completedCoachings.length}
              sub={
                completedCoachings.length > 0
                  ? "Sesi yang sudah ditutup"
                  : "Belum ada coaching selesai"
              }
              accent="bg-emerald-100 text-emerald-700"
              href="/coaching"
            />
            <Kpi
              icon={Eye}
              label="Total Supervisi"
              value={profileData?.supervisions?.length ?? 0}
              sub="Histori supervisi Anda"
              accent="bg-violet-100 text-violet-700"
              href="/supervision"
            />
          </div>
        </div>

        {/* ── 4. Tindak Lanjut Aktif + Supervisi Terakhir ──── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Active Coachings */}
          <Panel
            title="Tindak Lanjut Aktif"
            description="Yang perlu Anda selesaikan"
          >
            {activeCoachings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada tindak lanjut aktif.
              </p>
            ) : (
              <ul className="divide-y">
                {activeCoachings.slice(0, 3).map((c) => {
                  const total = c.completedActions + c.pendingActions;
                  const pct = total > 0 ? (c.completedActions / total) * 100 : 0;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {c.focus_area ?? "Sesi coaching"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.session_date).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short" }
                          )}
                          {" · "}
                          {c.completedActions}/{total} selesai
                        </p>
                        <div
                          className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <Link
                        href={`/coaching/${c.id}`}
                        className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-muted"
                      >
                        Buka
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {activeCoachings.length > 0 && (
              <Link
                href="/coaching"
                className="mt-3 flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                Lihat semua coaching
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </Panel>

          {/* Recent Supervisions */}
          <Panel
            title="Supervisi Terakhir"
            description="Riwayat supervisi Anda"
          >
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
                      <p className="text-sm font-semibold">
                        {new Date(s.supervision_date).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.strengths ?? s.improvements ?? s.status}
                      </p>
                    </div>
                    <span
                      className={`tnum shrink-0 text-lg font-bold ${scoreColor(s.overall_score)}`}
                    >
                      {s.overall_score ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── 5. Aksi Cepat ─────────────────────────────────── */}
        <div>
          <div className="mb-3">
            <h3 className="font-bold">Aksi Cepat</h3>
            <p className="text-sm text-muted-foreground">
              Pintasan ke halaman kerja Anda
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ActionTile
              href="/coaching"
              icon={MessagesSquare}
              label="Coaching"
              sub={
                activeCoachings.length === 0
                  ? "Semua selesai"
                  : `${activeCoachings.length} sesi aktif`
              }
              accent="bg-blue-100 text-blue-600"
            />
            <ActionTile
              href="/supervision"
              icon={Eye}
              label="Supervisi"
              sub={`${profileData?.supervisions?.length ?? 0} riwayat`}
              accent="bg-violet-100 text-violet-600"
            />
            <ActionTile
              href="/learning"
              icon={BookOpen}
              label="Modul Ajar"
              sub="Perangkat pembelajaran"
              accent="bg-amber-100 text-amber-600"
            />
            <ActionTile
              href="/profil"
              icon={Sprout}
              label="Profil & Growth"
              sub={
                latest?.overall_score !== null && latest?.overall_score !== undefined
                  ? `Skor ${latest.overall_score}`
                  : "Lihat perkembangan"
              }
              accent="bg-emerald-100 text-emerald-600"
            />
            <ActionTile
              href={
                homeroomCard
                  ? `/students/absensi?tahun=${encodeURIComponent(homeroomCard.year)}&kelas=${encodeURIComponent(homeroomCard.className)}`
                  : "/students/absensi"
              }
              icon={GraduationCap}
              label="Absensi Siswa"
              sub={
                homeroomCard
                  ? `Kelas ${homeroomCard.className}`
                  : "Pilih kelas"
              }
              accent="bg-rose-100 text-rose-600"
            />
          </div>
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
    supervisionAverageScore: number | null;
    coachingTotal: number;
    topPositive: {
      teacherId: string;
      name: string;
      subject: string | null;
      latestScore: number | null;
      growth: number | null;
    }[];
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

  // Modul Ajar: berapa guru sudah mengumpulkan modul terbits.
  // Gagal diam-diam (migrasi/tabel belum tentu ada).
  let lessonSubmission: {
    teacherCount: number;
    submittedCount: number;
    percent: number;
  } | null = null;
  try {
    const s = await getLessonSubmissionStats();
    if (s.teacherCount > 0) lessonSubmission = s;
  } catch {
    lessonSubmission = null;
  }

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
    const topPositive = overview.teachers
      .filter((t) => t.growth !== null && t.growth > 0)
      .sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))
      .slice(0, 3)
      .map((t) => ({
        teacherId: t.teacherId,
        name: t.name,
        subject: t.subject,
        latestScore: t.latest?.overall_score ?? null,
        growth: t.growth,
      }));
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
      supervisionAverageScore: supervision.averageScore,
      coachingTotal: coaching.totalSessions,
      topPositive,
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
  let promotionQueue: {
    decision: { id: string; recommendation: string | null };
    studentName: string;
    recommenderName: string | null;
  }[] = [];
  try {
    const [promotionStats, queue] = await Promise.all([
      getPromotionStats(currentAcademicYear()),
      getPromotionQueue(currentAcademicYear()),
    ]);
    if (promotionStats.total > 0) {
      promotionSummary = {
        total: promotionStats.total,
        submitted: promotionStats.submitted,
        decided: promotionStats.decided,
      };
    }
    promotionQueue = queue.slice(0, 3).map((q) => ({
      decision: { id: q.decision.id, recommendation: q.decision.recommendation },
      studentName: q.studentName,
      recommenderName: q.recommenderName,
    }));
  } catch {
    promotionSummary = null;
    promotionQueue = [];
  }

  // Ringkasan Program Sekolah semester berjalan: gagal diam-diam bila
  // tidak ada akses/data.
  const programSemester = currentSemester();
  const programYear = currentAcademicYear();
  let programSummary: Awaited<ReturnType<typeof getProgramSummary>> | null =
    null;
  // Agenda terdekat: program yang akan/sedang berjalan (mulai dalam
  // ≤ 30 hari ATAU sedang berjalan), diurut dari yang paling dekat.
  let upcomingPrograms: Awaited<
    ReturnType<typeof getProgramSummary>
  >["programs"] = [];
  try {
    const summary = await getProgramSummary({
      semester: programSemester,
      academicYear: programYear,
    });
    if (summary.programs.length > 0) programSummary = summary;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 30);
    upcomingPrograms = summary.programs
      .filter((p) => p.status !== "completed" && p.status !== "cancelled")
      .filter((p) => {
        if (p.status === "ongoing") return true;
        if (!p.start_date) return false;
        const d = new Date(p.start_date);
        return d >= today && d <= horizon;
      })
      .sort((a, b) => {
        const ad = a.start_date ? new Date(a.start_date).getTime() : Infinity;
        const bd = b.start_date ? new Date(b.start_date).getTime() : Infinity;
        return ad - bd;
      })
      .slice(0, 3);
  } catch {
    programSummary = null;
  }

  return (
    <div className="space-y-6">
      {!stats && (
        <PageHeader
          eyebrow={state.school.name}
          title={`${greeting}${user?.fullName ? `, ${user.fullName}` : ""}`}
          description="Kondisi sekolah hari ini — semua angka dari data nyata."
        />
      )}

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
          {/* ── 1. Hero: sapaan + ringkasan hari ini ─────────── */}
          {(() => {
            const todayLabel = new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const waiting = stats.pendingCoaching + stats.overdueActions;
            const chips: string[] = [];
            if (waiting > 0) chips.push(`${waiting} tindak lanjut menunggu`);
            if (stats.attentionCount > 0)
              chips.push(`${stats.attentionCount} guru perlu perhatian`);
            if (
              stats.supervisionDraft + stats.supervisionFollowUp > 0
            )
              chips.push(
                `${stats.supervisionDraft + stats.supervisionFollowUp} supervisi belum selesai`
              );
            return (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-emerald-800 to-teal-700 text-white shadow-lg">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-28 right-32 h-56 w-56 rounded-full bg-white/10"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-black/10"
                />
                <div className="relative p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
                    {state.school.name}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    {greeting}
                    {user?.fullName ? `, ${user.fullName}` : ""}!
                  </h2>
                  <p className="mt-1 text-sm capitalize text-emerald-50/90">
                    {todayLabel} — semua angka dari data nyata.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {chips.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Semua beres hari ini
                      </span>
                    ) : (
                      chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-amber-300"
                            aria-hidden
                          />
                          {chip}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── 2. Perlu Perhatian (compact) ─────────────────── */}
          {(() => {
            const cards: {
              value: number;
              label: string;
              href: string;
              color: string;
            }[] = [];
            if (stats.overdueActions > 0) {
              cards.push({
                value: stats.overdueActions,
                label: "Tindak lanjut terlambat",
                href: "/coaching",
                color:
                  "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400",
              });
            }
            if (stats.attentionCount > 0) {
              cards.push({
                value: stats.attentionCount,
                label: "Guru perlu perhatian",
                href: "/growth",
                color:
                  "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400",
              });
            }
            const supervisionOpen =
              stats.supervisionDraft + stats.supervisionFollowUp;
            if (supervisionOpen > 0) {
              cards.push({
                value: supervisionOpen,
                label: "Supervisi belum selesai",
                href: "/supervision",
                color:
                  "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-400",
              });
            }
            if (stats.pendingCoaching > 0) {
              cards.push({
                value: stats.pendingCoaching,
                label: "Tindak lanjut menunggu",
                href: "/coaching",
                color:
                  "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400",
              });
            }
            if (cards.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2">
                {cards.map((card) => (
                  <Link
                    key={card.label}
                    href={card.href}
                    className={`group inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm transition-all hover:-translate-y-px hover:shadow-sm ${card.color}`}
                  >
                    <AlertTriangle
                      className="h-4 w-4 shrink-0"
                      aria-hidden
                    />
                    <span className="tnum font-bold">{card.value}</span>
                    <span className="font-medium">{card.label}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            );
          })()}

          {/* ── 3. Sorotan: Modul Ajar + Top Tumbuh Positif ────── */}
          {(() => {
            if (!lessonSubmission && stats.topPositive.length === 0) return null;
            return (
              <div className="grid gap-4 lg:grid-cols-5">
                {/* Pengumpulan Modul Ajar */}
                {lessonSubmission && (
                  <Link
                    href="/learning"
                    className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all hover:border-brand/40 hover:shadow-[0_8px_20px_rgba(16,24,40,0.10)] lg:col-span-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                          <FileText className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-muted-foreground">
                            Pengumpulan Modul Ajar
                          </p>
                          <p className="tnum text-2xl font-bold leading-tight">
                            {lessonSubmission.percent}%
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand" />
                    </div>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={lessonSubmission.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${lessonSubmission.percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {lessonSubmission.submittedCount} dari{" "}
                      {lessonSubmission.teacherCount} guru sudah mengumpulkan
                      modul terbits.
                    </p>
                  </Link>
                )}

                {/* Top Tumbuh Positif */}
                {stats.topPositive.length > 0 && (
                  <div
                    className={`rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${
                      lessonSubmission ? "lg:col-span-3" : "lg:col-span-5"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <h3 className="text-sm font-bold">Top Tumbuh Positif</h3>
                      </div>
                      <Link
                        href="/growth"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                      >
                        Lihat semua
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                    <ul className="divide-y">
                      {stats.topPositive.map((t, i) => (
                        <li
                          key={t.teacherId}
                          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold">
                              {t.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {t.subject ?? "Tanpa mapel"}
                              {t.latestScore !== null
                                ? ` · Skor ${t.latestScore}`
                                : ""}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                            <TrendingUp className="h-3 w-3" aria-hidden />
                            +{t.growth?.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── 4. Angka kunci ────────────────────────────────── */}
          <div>
            <div className="mb-3 flex items-end justify-between">
              <h3 className="font-bold">Angka Kunci</h3>
              <Link
                href="/growth"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
              >
                Lihat Teacher Growth
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Kpi
                icon={Users}
                label="Total Guru"
                value={stats.teacherCount}
                sub={`${stats.positiveGrowth} tumbuh positif`}
                accent="bg-violet-100 text-violet-700"
                href="/teachers"
              />
              <Kpi
                icon={LineChart}
                label="Rata-rata Growth"
                value={
                  stats.averageGrowth !== null ? stats.averageGrowth : "—"
                }
                sub={
                  stats.attentionCount > 0
                    ? `${stats.attentionCount} perlu perhatian`
                    : "Semua dalam batas aman"
                }
                accent="bg-emerald-100 text-emerald-700"
                href="/growth"
                segments={
                  stats.averageGrowth !== null
                    ? [
                        {
                          pct: stats.averageGrowth,
                          className:
                            stats.averageGrowth >= 70
                              ? "bg-emerald-500"
                              : "bg-amber-500",
                        },
                      ]
                    : undefined
                }
                barLabel={`Rata-rata growth ${stats.averageGrowth ?? "belum ada data"} dari 100`}
              />
              <Kpi
                icon={ClipboardCheck}
                label="Tindak Lanjut"
                value={stats.completedActions}
                sub={
                  stats.totalActions > 0
                    ? `${stats.completedActions} dari ${stats.totalActions} selesai`
                    : "Belum ada tindak lanjut"
                }
                accent="bg-amber-100 text-amber-700"
                href="/coaching"
                segments={
                  stats.totalActions > 0
                    ? [
                        {
                          pct:
                            (stats.completedActions / stats.totalActions) * 100,
                          className: "bg-emerald-500",
                        },
                        {
                          pct:
                            (stats.overdueActions / stats.totalActions) * 100,
                          className: "bg-rose-500",
                        },
                      ]
                    : undefined
                }
                barLabel={`${stats.completedActions} dari ${stats.totalActions} tindak lanjut selesai`}
              />
              <Kpi
                icon={GraduationCap}
                label="Total Siswa"
                value={schoolSize?.students ?? "—"}
                sub={
                  schoolSize
                    ? `${schoolSize.male} laki-laki • ${schoolSize.female} perempuan`
                    : "Belum ada data"
                }
                accent="bg-blue-100 text-blue-700"
                href="/students"
                segments={
                  schoolSize && schoolSize.students > 0
                    ? [
                        {
                          pct:
                            (schoolSize.male / schoolSize.students) * 100,
                          className: "bg-blue-500",
                        },
                        {
                          pct:
                            (schoolSize.female / schoolSize.students) * 100,
                          className: "bg-rose-400",
                        },
                      ]
                    : undefined
                }
                barLabel={`${schoolSize?.male ?? 0} laki-laki, ${schoolSize?.female ?? 0} perempuan`}
              />
              <Kpi
                icon={School}
                label="Total Kelas"
                value={schoolSize?.classes ?? "—"}
                sub="Kelas aktif tahun ini"
                accent="bg-orange-100 text-orange-700"
                href="/students"
              />
              <Kpi
                icon={LineChart}
                label="Rata-rata Nilai Supervisi"
                value={
                  stats.supervisionAverageScore !== null
                    ? stats.supervisionAverageScore
                    : "—"
                }
                sub={
                  stats.supervisionTotal > 0
                    ? `${stats.supervisionCompleted}/${stats.supervisionTotal} supervisi dinilai`
                    : "Belum ada supervisi dinilai"
                }
                accent="bg-cyan-100 text-cyan-700"
                href="/supervision"
                segments={
                  stats.supervisionAverageScore !== null
                    ? [
                        {
                          pct: stats.supervisionAverageScore,
                          className:
                            stats.supervisionAverageScore >= 85
                              ? "bg-emerald-500"
                              : stats.supervisionAverageScore >= 70
                                ? "bg-cyan-500"
                                : "bg-amber-500",
                        },
                      ]
                    : undefined
                }
                barLabel={`Rata-rata nilai supervisi ${stats.supervisionAverageScore ?? "belum ada data"} dari 100`}
              />
            </div>
          </div>

          {/* ── 5. Tren Growth + AI Insight (berdampingan) ───── */}
          <div className="grid gap-4 lg:grid-cols-7">
            <Panel
              title="Tren Pertumbuhan"
              description="Rata-rata skor per periode"
              className="lg:col-span-4"
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
            <Panel
              title="AI School Insight"
              description="Ringkasan kondisi dari data ringkasan. Tidak menilai individu."
              className="lg:col-span-3"
            >
              <AISchoolInsight initial={cachedSchoolInsight} />
            </Panel>
          </div>

          {/* ── 6. Status: Supervisi + Coaching + Program ─────── */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Status Supervisi"
              description="Distribusi status"
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
                    name: "T.Lanjut",
                    value: stats.supervisionFollowUp,
                    color: "#d97706",
                  },
                  {
                    name: "Ditutup",
                    value: stats.supervisionClosed,
                    color: "#2563eb",
                  },
                ]}
                height={180}
                maxValue={Math.max(
                  stats.supervisionDraft,
                  stats.supervisionCompleted,
                  stats.supervisionFollowUp,
                  stats.supervisionClosed,
                  1
                )}
              />
            </Panel>
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
                height={160}
              />
              <div className="mt-2 flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Selesai
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Menunggu
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                  Terlambat
                </span>
              </div>
            </Panel>
            <Panel
              title={`Program ${semesterLabel(programSemester)}`}
              action={
                <Link
                  href="/programs"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                >
                  Kelola
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              }
            >
              {programSummary ? (
                <div>
                  <DonutChart
                    data={[
                      {
                        name: "Berjalan",
                        value: programSummary.counts.ongoing,
                        color: "#d97706",
                      },
                      {
                        name: "Rencana",
                        value: programSummary.counts.planned,
                        color: "#2563eb",
                      },
                      {
                        name: "Selesai",
                        value: programSummary.counts.completed,
                        color: "#059669",
                      },
                      ...(programSummary.counts.cancelled > 0
                        ? [
                            {
                              name: "Batal",
                              value: programSummary.counts.cancelled,
                              color: "#94a3b8",
                            },
                          ]
                        : []),
                    ].filter((d) => d.value > 0)}
                    height={150}
                  />
                  <p className="mt-2 text-center text-sm font-semibold">
                    {programSummary.overall !== null
                      ? `${programSummary.overall}%`
                      : "—"}{" "}
                    terlaksana
                  </p>
                  <p className="text-center text-xs text-muted-foreground">
                    {programSummary.counts.completed} dari{" "}
                    {programSummary.programs.length -
                      programSummary.counts.cancelled}{" "}
                    program
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Target className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Belum ada program semester ini
                  </p>
                </div>
              )}
            </Panel>
          </div>

          {/* ── 6. Agenda Terdekat + Menunggu Verifikasi ─────── */}
          {(() => {
            if (upcomingPrograms.length === 0 && promotionQueue.length === 0) {
              return null;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const formatDateShort = (iso: string): string => {
              return new Date(iso).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              });
            };
            const daysUntil = (iso: string): number => {
              const d = new Date(iso);
              d.setHours(0, 0, 0, 0);
              return Math.round((d.getTime() - today.getTime()) / 86_400_000);
            };

            const recommendationLabel: Record<string, string> = {
              naik: "Naik",
              tidak_naik: "Tidak Naik",
              pertimbangan: "Pertimbangan",
            };
            const recommendationTone: Record<
              string,
              string
            > = {
              naik: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
              tidak_naik: "bg-rose-50 text-rose-700 ring-rose-600/20",
              pertimbangan: "bg-amber-50 text-amber-700 ring-amber-600/25",
            };

            return (
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Agenda Terdekat */}
                {upcomingPrograms.length > 0 && (
                  <Panel
                    title="Agenda Terdekat"
                    description="Program yang akan/sedang berjalan"
                    action={
                      <Link
                        href="/programs"
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                      >
                        Kelola
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    }
                  >
                    <ul className="divide-y">
                      {upcomingPrograms.map((p) => {
                        const days = p.start_date ? daysUntil(p.start_date) : null;
                        const isOngoing = p.status === "ongoing";
                        return (
                          <li
                            key={p.id}
                            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                          >
                            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-brand/10 text-brand">
                              <Calendar className="h-3.5 w-3.5" aria-hidden />
                              {p.start_date && (
                                <span className="tnum mt-0.5 text-[10px] font-bold leading-none">
                                  {formatDateShort(p.start_date)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-semibold">
                                {p.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {p.category ?? "Kegiatan"}
                                {p.progress !== null
                                  ? ` · Jalan ${p.progress}%`
                                  : ""}
                              </p>
                            </div>
                            {isOngoing ? (
                              <span className="inline-flex shrink-0 items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                Berjalan
                              </span>
                            ) : days !== null && days <= 3 ? (
                              <span className="inline-flex shrink-0 items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                                {days === 0 ? "Hari ini" : `${days} hari lagi`}
                              </span>
                            ) : days !== null ? (
                              <span className="tnum shrink-0 text-xs font-semibold text-muted-foreground">
                                {days} hari lagi
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </Panel>
                )}

                {/* Menunggu Verifikasi */}
                {promotionQueue.length > 0 && (
                  <Panel
                    title="Menunggu Verifikasi"
                    description="Rekomendasi kenaikan kelas dari wali kelas"
                    action={
                      <Link
                        href="/kenaikan-kelas"
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                      >
                        Buka
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    }
                  >
                    <ul className="divide-y">
                      {promotionQueue.map((q) => {
                        const recKey = q.decision.recommendation ?? "—";
                        const tone =
                          recommendationTone[recKey] ??
                          "bg-muted text-muted-foreground ring-border";
                        const label = recommendationLabel[recKey] ?? "—";
                        return (
                          <li
                            key={q.decision.id}
                            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                              <GraduationCap className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-semibold">
                                {q.studentName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {q.recommenderName
                                  ? `Rekomendasi ${q.recommenderName}`
                                  : "Rekomendasi wali kelas"}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}
                            >
                              {q.decision.recommendation ? label : "Menunggu"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </Panel>
                )}
              </div>
            );
          })()}

          {/* ── 8. Grafik kesiswaan ───────────────────────────── */}
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

          {/* ── 9. Kenaikan Kelas (strip ringkasan) ───────────── */}
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

          {/* ── 10. Aksi Cepat ────────────────────────────────── */}
          <div>
            <div className="mb-3">
              <h3 className="font-bold">Aksi Cepat</h3>
              <p className="text-sm text-muted-foreground">
                Tugas utama Anda — satu ketukan ke halaman kerja
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <ActionTile
                href="/supervision"
                icon={Eye}
                label="Supervisi"
                sub={`${stats.supervisionCompleted}/${stats.supervisionTotal} selesai`}
                accent="bg-violet-100 text-violet-600"
              />
              <ActionTile
                href="/coaching"
                icon={MessagesSquare}
                label="Coaching"
                sub={
                  stats.pendingCoaching === 0
                    ? "Semua selesai"
                    : `${stats.pendingCoaching} menunggu`
                }
                accent="bg-blue-100 text-blue-600"
              />
              <ActionTile
                href="/growth"
                icon={Sprout}
                label="Teacher Growth"
                sub={
                  stats.averageGrowth !== null
                    ? `Rata-rata ${stats.averageGrowth}`
                    : "Belum ada data"
                }
                accent="bg-emerald-100 text-emerald-600"
              />
              <ActionTile
                href="/teachers"
                icon={Users}
                label="Data Guru"
                sub={`${stats.teacherCount} guru terdaftar`}
                accent="bg-slate-100 text-slate-600"
              />
              <ActionTile
                href="/programs"
                icon={Target}
                label="Program Sekolah"
                sub={
                  programSummary && programSummary.overall !== null
                    ? `Jalan ${programSummary.overall}%`
                    : "Kelola kegiatan"
                }
                accent="bg-cyan-100 text-cyan-600"
              />
            </div>
          </div>

          {/* ── 11. Kode Undangan ─────────────────────────────── */}
          <InviteCodeCard code={inviteCode} />
        </>
      )}
    </div>
  );
}
