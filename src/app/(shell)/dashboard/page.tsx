import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  LineChart,
  MessagesSquare,
  Users,
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
import { Empty, PageHeader, Panel, Stat } from "@/components/common";
import InviteCodeCard from "@/components/school/invite-code-card";

export const dynamic = "force-dynamic";

function Shortcut({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-brand/40"
    >
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
        aria-hidden
      />
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

  if (!isLeader) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={state.school.name}
          title={`${greeting}${user?.fullName ? `, ${user.fullName}` : ""}`}
          description="Kelola pembelajaran dan pantau perkembangan Anda."
        />
        <Panel title="Ringkasan Anda">
          <p className="text-sm text-muted-foreground">
            Anda tergabung di <strong className="text-foreground">{state.school.name}</strong>.
            Gunakan menu di samping untuk supervisi, coaching, dan modul ajar.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Shortcut
              href="/supervision"
              title="Supervisi"
              description="Hasil supervisi Anda"
            />
            <Shortcut
              href="/coaching"
              title="Coaching"
              description="Sesi dan tindak lanjut"
            />
            <Shortcut
              href="/learning"
              title="Modul Ajar"
              description="Perangkat pembelajaran"
            />
          </div>
        </Panel>
      </div>
    );
  }

  let stats: {
    teacherCount: number;
    averageGrowth: number | null;
    positiveGrowth: number;
    attentionCount: number;
    pendingCoaching: number;
    overdueActions: number;
    supervisionCompleted: number;
    supervisionTotal: number;
    coachingTotal: number;
  } | null = null;
  let inviteCode: string | null = null;
  let loadError: string | null = null;

  try {
    const [overview, coaching, supervision, code] = await Promise.all([
      getSchoolGrowthOverview(),
      getCoachingStats(),
      getSupervisionStats(),
      getMySchoolInviteCode(),
    ]);
    stats = {
      teacherCount: overview.teacherCount,
      averageGrowth: overview.averageOverall,
      positiveGrowth: overview.positiveCount,
      attentionCount: overview.attentionCount,
      pendingCoaching: coaching.pendingActions,
      overdueActions: coaching.overdueActions,
      supervisionCompleted: supervision.completed,
      supervisionTotal: supervision.total,
      coachingTotal: coaching.totalSessions,
    };
    inviteCode = code;
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Gagal memuat data dashboard";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={state.school.name}
        title={`${greeting}${user?.fullName ? `, ${user.fullName}` : ""}`}
        description="Berikut kondisi sekolah hari ini — semua angka dihitung dari data nyata."
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              icon={Users}
              label="Total Guru"
              value={stats.teacherCount}
              sub={`${stats.positiveGrowth} tumbuh positif`}
            />
            <Stat
              icon={LineChart}
              label="Rata-rata Growth"
              value={
                stats.averageGrowth !== null
                  ? `${stats.averageGrowth}%`
                  : "—"
              }
              sub={
                stats.attentionCount > 0
                  ? `${stats.attentionCount} perlu perhatian`
                  : "Semua dalam batas normal"
              }
              tone={stats.attentionCount > 0 ? "danger" : "brand"}
            />
            <Stat
              icon={ClipboardCheck}
              label="Tindak Lanjut Aktif"
              value={stats.pendingCoaching}
              sub={
                stats.overdueActions > 0
                  ? `${stats.overdueActions} melewati target`
                  : "Tidak ada yang terlambat"
              }
              tone={stats.overdueActions > 0 ? "danger" : "default"}
            />
            <Stat
              icon={MessagesSquare}
              label="Sesi Coaching"
              value={stats.coachingTotal}
              sub={`Supervisi selesai ${stats.supervisionCompleted}/${stats.supervisionTotal}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Shortcut
                href="/supervision"
                title="Supervisi"
                description={`${stats.supervisionCompleted} dari ${stats.supervisionTotal} supervisi selesai.`}
              />
              <Shortcut
                href="/coaching"
                title="Coaching"
                description={
                  stats.pendingCoaching === 0
                    ? "Tidak ada tindak lanjut menunggu."
                    : `${stats.pendingCoaching} tindak lanjut menunggu penyelesaian.`
                }
              />
              <Shortcut
                href="/growth"
                title="Teacher Growth"
                description={
                  stats.averageGrowth !== null
                    ? `Rata-rata sekolah ${stats.averageGrowth} — ${stats.positiveGrowth} guru tumbuh positif.`
                    : "Belum ada data perkembangan."
                }
              />
            </div>
            <InviteCodeCard code={inviteCode} />
          </div>
        </>
      )}
    </div>
  );
}
