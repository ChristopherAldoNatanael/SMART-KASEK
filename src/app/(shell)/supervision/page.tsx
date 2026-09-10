import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import {
  getSupervisions,
  getSupervisionStats,
} from "@/services/supervision.service";
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
  draft: "Draft",
  completed: "Selesai",
  follow_up: "Tindak Lanjut",
  closed: "Ditutup",
};

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "info"> = {
  draft: "neutral",
  completed: "success",
  follow_up: "warning",
  closed: "info",
};

export default async function SupervisionPage() {
  const [supervisions, stats] = await Promise.all([
    getSupervisions(),
    getSupervisionStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pembelajaran"
        title="Supervisi"
        description="Hasil observasi kelas dan temuan yang ditindaklanjuti coaching."
        actions={
          <Link
            href="/supervision/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Supervisi
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {[
          { label: "Total", value: stats.total },
          { label: "Draft", value: stats.draft },
          { label: "Selesai", value: stats.completed },
          { label: "Tindak Lanjut", value: stats.followUp },
          {
            label: "Rata-rata Skor",
            value: stats.averageScore ?? "—",
          },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="tnum text-lg font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {supervisions.length === 0 ? (
        <Empty
          icon={ClipboardList}
          title="Belum ada data supervisi"
          description="Catat supervisi pertama untuk mulai menggerakkan alur temuan → coaching → tindak lanjut."
          actionHref="/supervision/new"
          actionLabel="Tambah Supervisi"
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Guru</Th>
            <Th>Tanggal</Th>
            <Th>Tipe</Th>
            <Th className="text-right">Skor</Th>
            <Th>Status</Th>
            <Th className="text-right">Aksi</Th>
          </TableHead>
          <tbody>
            {supervisions.map((supervision) => (
              <tr
                key={supervision.id}
                className="border-b transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="px-4 py-3 font-medium">
                  {supervision.teacher?.profile?.full_name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(supervision.supervision_date).toLocaleDateString(
                    "id-ID",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {supervision.type ?? "—"}
                </td>
                <td className="tnum px-4 py-3 text-right font-semibold">
                  {supervision.overall_score ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONES[supervision.status] ?? "neutral"}>
                    {STATUS_LABELS[supervision.status] ?? supervision.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/supervision/${supervision.id}`}
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
