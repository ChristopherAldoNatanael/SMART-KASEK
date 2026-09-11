import Link from "next/link";
import { MessagesSquare, Plus } from "lucide-react";
import {
  getCoachingSessions,
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

export default async function CoachingPage() {
  const [sessions, stats] = await Promise.all([
    getCoachingSessions(),
    getCoachingStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pengembangan"
        title="Coaching"
        description="Sesi pendampingan guru dan tindak lanjut yang disepakati."
        actions={
          <Link
            href="/coaching/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Sesi
          </Link>
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
          title="Belum ada sesi coaching"
          description="Buat sesi coaching dari temuan supervisi atau kebutuhan guru."
          actionHref="/coaching/new"
          actionLabel="Tambah Sesi"
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Guru</Th>
            <Th>Tanggal</Th>
            <Th>Fokus</Th>
            <Th>Tindakan</Th>
            <Th>Status</Th>
            <Th className="text-right">Aksi</Th>
          </TableHead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="border-b transition-colors last:border-0 hover:bg-muted/40"
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
                <td className="tnum whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {session.actions?.length ?? 0} tindakan
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
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
