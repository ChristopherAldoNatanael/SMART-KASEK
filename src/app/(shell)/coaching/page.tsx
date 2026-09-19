import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, Plus, AlertTriangle, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  getCoachingSessionsPage,
  getCoachingStats,
} from "@/services/coaching.service";
import {
  Badge,
  Empty,
  PageHeader,
  TableHead,
  TableShell,
  Th,
} from "@/components/common";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Terjadwal",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_TONES: Record<string, "info" | "warning" | "success" | "neutral"> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
};

function getOverdueCount(session: {
  actions: { status: string; target_date: string | null }[];
}): number {
  const today = new Date().toISOString().split("T")[0];
  return session.actions.filter(
    (a) => a.status === "pending" && a.target_date && a.target_date < today
  ).length;
}

function getApproachingCount(session: {
  actions: { status: string; target_date: string | null }[];
}): number {
  const today = new Date();
  const threeDays = new Date(today);
  threeDays.setDate(today.getDate() + 3);
  const todayStr = today.toISOString().split("T")[0];
  const threeDaysStr = threeDays.toISOString().split("T")[0];

  return session.actions.filter((a) => {
    if (a.status !== "pending" || !a.target_date) return false;
    return a.target_date >= todayStr && a.target_date <= threeDaysStr;
  }).length;
}

const PAGE_SIZE = 20;

export default async function CoachingPage({
  searchParams,
}: {
  searchParams?: { hal?: string };
}) {
  const halParam = Number.parseInt(searchParams?.hal ?? "", 10);
  const hal =
    Number.isFinite(halParam) && halParam > 0 ? Math.floor(halParam) : 1;

  const [paged, stats, user] = await Promise.all([
    getCoachingSessionsPage(hal, PAGE_SIZE),
    getCoachingStats(),
    getCurrentUser(),
  ]);
  const sessions = paged.rows;
  const isLeader = user !== null && hasRole(user.role, "principal");
  const isTeacher = user?.role === "teacher";

  const totalPages =
    paged.total === null
      ? null
      : Math.max(1, Math.ceil(paged.total / paged.pageSize));

  // Halaman di luar jangkauan → kembali ke halaman terakhir.
  if (
    totalPages !== null &&
    paged.total !== null &&
    paged.total > 0 &&
    sessions.length === 0 &&
    hal > 1
  ) {
    redirect(`/coaching?hal=${totalPages}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pengembangan"
        title={isTeacher ? "Coaching Saya" : "Coaching"}
        description={
          isTeacher
            ? "Kerjakan tindak lanjut Anda dan laporkan progres + bukti."
            : "Sesi pendampingan guru dan tindak lanjut yang disepakati."
        }
        actions={
          isLeader ? (
            <Link
              href="/coaching/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah Sesi
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {[
          { label: "Total Sesi", value: stats.totalSessions },
          { label: "Total Tindakan", value: stats.totalActions },
          { label: "Menunggu", value: stats.pendingActions },
          { label: "Selesai", value: stats.completedActions },
          { label: "Terlambat", value: stats.overdueActions },
        ].map((s, i) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <span className="text-muted-foreground">{s.label}</span>
            <span
              className={`tnum text-lg font-bold ${i === 4 && stats.overdueActions > 0 ? "text-rose-600" : ""}`}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <Empty
          icon={MessagesSquare}
          title={isTeacher ? "Belum ada coaching untuk Anda" : "Belum ada sesi coaching"}
          description={
            isTeacher
              ? "Kepala Sekolah akan membuatkan sesi dari hasil supervisi. Setelah ada, kerjakan dan laporkan di halaman detail."
              : "Buat sesi coaching dari temuan supervisi atau kebutuhan guru."
          }
          actionHref={isLeader ? "/coaching/new" : undefined}
          actionLabel={isLeader ? "Tambah Sesi" : undefined}
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Guru</Th>
            <Th>Tanggal</Th>
            <Th>Fokus</Th>
            <Th>Progres</Th>
            <Th>Status</Th>
            <Th className="text-right">Aksi</Th>
          </TableHead>
          <tbody>
            {sessions.map((session) => {
              const overdueCount = getOverdueCount(session);
              const approachingCount = getApproachingCount(session);
              const completedCount = session.actions?.filter(
                (a) => a.status === "completed"
              ).length ?? 0;
              const totalActions = session.actions?.length ?? 0;
              const hasWarning = overdueCount > 0 || approachingCount > 0;

              return (
                <tr
                  key={session.id}
                  className={`border-b transition-colors last:border-0 hover:bg-muted/40 ${overdueCount > 0 ? "bg-rose-50/50" : ""}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {session.teacher?.profile?.full_name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(session.session_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">
                    {session.focus_area ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="tnum text-sm text-muted-foreground">
                        {completedCount}/{totalActions}
                      </span>
                      {hasWarning && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          {overdueCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-rose-700">
                              <AlertTriangle className="h-3 w-3" aria-hidden />
                              {overdueCount}
                            </span>
                          ) : null}
                          {approachingCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">
                              <Clock className="h-3 w-3" aria-hidden />
                              {approachingCount}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONES[session.status] ?? "neutral"}>
                      {STATUS_LABELS[session.status] ?? session.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/coaching/${session.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      {totalPages !== null && totalPages > 1 && (
        <nav
          aria-label="Halaman coaching"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-5 py-3 text-sm"
        >
          <span className="text-muted-foreground">
            Halaman {hal} dari {totalPages} • Total {paged.total} sesi
          </span>
          <span className="flex gap-2">
            {hal > 1 ? (
              <Link
                href={`/coaching?hal=${hal - 1}`}
                className="rounded-md border px-3 py-1.5 font-medium transition-colors hover:bg-muted"
              >
                ← Sebelumnya
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 text-muted-foreground opacity-50">
                ← Sebelumnya
              </span>
            )}
            {hal < totalPages ? (
              <Link
                href={`/coaching?hal=${hal + 1}`}
                className="rounded-md border px-3 py-1.5 font-medium transition-colors hover:bg-muted"
              >
                Berikutnya →
              </Link>
            ) : (
              <span className="rounded-md border px-3 py-1.5 text-muted-foreground opacity-50">
                Berikutnya →
              </span>
            )}
          </span>
        </nav>
      )}
    </div>
  );
}
