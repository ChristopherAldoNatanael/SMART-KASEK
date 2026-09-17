import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  getManagerialStats,
  getManagerialSupervisions,
} from "@/services/supervision-managerial.service";
import {
  Badge,
  Empty,
  PageHeader,
  TableHead,
  TableShell,
  Th,
} from "@/components/common";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function overallLabel(s: {
  managerial: { status: string } | null;
}): { label: string; tone: "neutral" | "success" | "warning" | "info" } {
  if (!s.managerial) return { label: "Belum Diisi", tone: "neutral" };
  if (s.managerial.status === "final") return { label: "Final", tone: "success" };
  return { label: "Draft", tone: "warning" };
}

export default async function ManagerialSupervisionPage() {
  const [supervisions, stats, user] = await Promise.all([
    getManagerialSupervisions(),
    getManagerialStats(),
    getCurrentUser(),
  ]);
  const isLeader = user !== null && hasRole(user.role, "principal");
  const isTeacher = user?.role === "teacher";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Supervisi • Manajerial"
        title={isTeacher ? "Supervisi Manajerial Saya" : "Supervisi Manajerial"}
        description="Kelengkapan Administrasi Kelas, Perencanaan Kegiatan Pembelajaran, dan Penyusunan ATP/Silabus berbasis Kurikulum Merdeka dengan pendekatan Deep Learning."
        actions={
          isLeader ? (
            <Link
              href="/supervision/manajerial/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Buat Supervisi Manajerial
            </Link>
          ) : undefined
        }
      />

      <nav
        aria-label="Jenis supervisi"
        className="inline-flex rounded-lg border bg-card p-1 text-sm font-medium"
      >
        <Link
          href="/supervision"
          className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          Akademik
        </Link>
        <span
          aria-current="page"
          className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
        >
          Manajerial
        </span>
      </nav>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {[
          { label: "Total", value: stats.total },
          { label: "Draft", value: stats.draft },
          { label: "Final", value: stats.final },
          {
            label: "Rata-rata Nilai",
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
          title={
            isTeacher
              ? "Belum ada supervisi manajerial untuk Anda"
              : "Belum ada data supervisi manajerial"
          }
          description={
            isTeacher
              ? "Kepala Sekolah akan membuat supervisi manajerial. Hasil penilaian dapat Anda lihat di sini."
              : "Buat supervisi manajerial pertama — pilih guru dan tahun pelajaran, lalu isi Instrumen 1–3."
          }
          actionHref={isLeader ? "/supervision/manajerial/new" : undefined}
          actionLabel={isLeader ? "Buat Supervisi Manajerial" : undefined}
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Guru</Th>
            <Th>Tahun Pelajaran</Th>
            <Th>Periode</Th>
            <Th className="text-right">Nilai</Th>
            <Th>Status</Th>
            <Th className="text-right">Aksi</Th>
          </TableHead>
          <tbody>
            {supervisions.map((supervision) => {
              const st = overallLabel(supervision);
              return (
                <tr
                  key={supervision.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium">
                    {supervision.teacher?.profile?.full_name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {(supervision as { academic_year?: string | null })
                      .academic_year ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(supervision as { period?: string | null }).period ?? "—"}
                  </td>
                  <td className="tnum px-4 py-3 text-right font-semibold">
                    {supervision.managerial?.overall_value != null
                      ? Number(supervision.managerial.overall_value).toLocaleString(
                          "id-ID",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/supervision/manajerial/${supervision.id}`}
                      className={cn("font-medium text-brand hover:underline")}
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
    </div>
  );
}
