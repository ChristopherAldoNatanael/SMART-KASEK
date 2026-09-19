import Link from "next/link";
import { ArrowRight, GraduationCap, Inbox } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  getExecutionPreview,
  getPromotionBoard,
  getPromotionHistory,
  getPromotionQueue,
  getPromotionStats,
} from "@/services/promotion.service";
import { currentAcademicYear } from "@/lib/students";
import {
  PROMOTION_DECISION_LABELS,
  PROMOTION_RECOMMENDATION_LABELS,
  promotionStatusLabel,
} from "@/lib/promotion";
import {
  Badge,
  Empty,
  PageHeader,
  Panel,
  TableHead,
  TableShell,
  Th,
} from "@/components/common";
import { SubmitClassBar } from "@/components/promotion/recommendation-form";
import ApplyDecisionsPanel from "@/components/promotion/apply-decisions-panel";
import YearSelect from "@/components/promotion/year-select";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "info" | "danger"> = {
  draft: "neutral",
  submitted: "info",
  returned: "warning",
  decided: "success",
};

const REC_TONES: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  naik: "success",
  tidak_naik: "danger",
  pertimbangan: "warning",
};

export default async function KenaikanKelasPage({
  searchParams,
}: {
  searchParams?: Promise<{ tahun?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const user = await getCurrentUser();
  const isLeader = user !== null && hasRole(user.role, "principal");

  if (!isLeader) {
    // ------------------------- Tampilan Wali Kelas -------------------------
    const year = query.tahun?.trim() || currentAcademicYear();
    let board: Awaited<ReturnType<typeof getPromotionBoard>> | null = null;
    let boardError: string | null = null;
    try {
      board = await getPromotionBoard(year);
    } catch (error) {
      boardError = error instanceof Error ? error.message : "Gagal memuat data";
    }

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Kenaikan Kelas"
          title={board ? `Kelas Saya — ${board.className}` : "Kelas Saya"}
          description="Beri rekomendasi untuk tiap siswa, lalu kirim ke Kepala Sekolah untuk diverifikasi."
        />

        {!board ? (
          <Empty
            icon={GraduationCap}
            title="Belum ada kelas untuk direview"
            description={boardError ?? "Anda belum ditetapkan sebagai wali kelas. Hubungi Kepala Sekolah."}
            actionHref="/dashboard"
            actionLabel="Kembali ke Dashboard"
          />
        ) : (
          <>
            <SubmitClassBar
              academicYear={year}
              className={board.className}
              reviewed={board.progress.reviewed}
              total={board.progress.total}
            />

            {board.students.length === 0 ? (
              <Empty
                icon={Inbox}
                title={`Belum ada siswa aktif di kelas ${board.className} tahun ${year}`}
                description="Tambahkan data siswa dulu di menu Kesiswaan."
                actionHref="/students"
                actionLabel="Ke Data Siswa"
              />
            ) : (
              <Panel
                title={`Daftar siswa — ${board.students.length} anak`}
                description="Ketuk nama untuk membuka detail, memberi rekomendasi, dan melihat kehadiran."
              >
                <TableShell>
                  <TableHead>
                    <Th>Siswa</Th>
                    <Th>Kehadiran</Th>
                    <Th>Rekomendasi</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Aksi</Th>
                  </TableHead>
                  <tbody>
                    {board.students.map((s) => {
                      const a = s.attendance;
                      return (
                        <tr
                          key={s.id}
                          className="border-b transition-colors last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium leading-tight">{s.full_name}</p>
                            {s.student_number && (
                              <p className="tnum mt-0.5 text-xs text-muted-foreground">
                                NIS {s.student_number}
                              </p>
                            )}
                          </td>
                          <td className="tnum whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                            H {a.hadir} • I {a.izin} • S {a.sakit} • A {a.alpa}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {s.decision?.recommendation ? (
                              <Badge tone={REC_TONES[s.decision.recommendation] ?? "neutral"}>
                                {PROMOTION_RECOMMENDATION_LABELS[
                                  s.decision.recommendation as keyof typeof PROMOTION_RECOMMENDATION_LABELS
                                ] ?? s.decision.recommendation}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Belum direview
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge tone={STATUS_TONES[s.decision?.status ?? "draft"] ?? "neutral"}>
                              {promotionStatusLabel(s.decision?.status ?? "draft")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/kenaikan-kelas/siswa/${s.id}?tahun=${encodeURIComponent(year)}`}
                              className={cn("font-medium text-brand hover:underline")}
                            >
                              Buka
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableShell>
              </Panel>
            )}
          </>
        )}
      </div>
    );
  }

  // ------------------------- Tampilan Kepala Sekolah -------------------------
  const stats = await getPromotionStats(
    query.tahun?.trim() || currentAcademicYear()
  ).catch(() => null);
  const year = query.tahun?.trim() || stats?.years[0] || currentAcademicYear();
  const [queue, history, execution] = await Promise.all([
    getPromotionQueue(year).catch(() => []),
    getPromotionHistory(year).catch(() => []),
    getExecutionPreview(year).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kenaikan Kelas"
        title="Verifikasi & Pengesahan"
        description="Periksa rekomendasi wali kelas, tetapkan keputusan, dan lihat riwayat per tahun pelajaran."
        actions={
          stats ? <YearSelect years={stats.years} active={year} base="/kenaikan-kelas" /> : undefined
        }
      />

      {stats && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          {[
            { label: "Total Siswa", value: stats.total },
            { label: "Sudah Direview", value: stats.reviewed },
            { label: "Menunggu Verifikasi", value: stats.submitted },
            { label: "Ditetapkan Naik", value: stats.decidedNaik },
            { label: "Ditetapkan Tidak Naik", value: stats.decidedTidak },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="tnum text-lg font-bold">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <Panel
        title={`Menunggu Verifikasi — ${queue.length}`}
        description="Rekomendasi wali kelas yang siap ditetapkan atau dikembalikan."
      >
        {queue.length === 0 ? (
          <Empty
            icon={Inbox}
            title="Tidak ada yang menunggu"
            description="Semua rekomendasi sudah diproses, atau wali kelas belum mengirim."
          />
        ) : (
          <TableShell>
            <TableHead>
              <Th>Siswa</Th>
              <Th>Kelas</Th>
              <Th>Rekomendasi Wali</Th>
              <Th className="text-right">Aksi</Th>
            </TableHead>
            <tbody>
              {queue.map((q) => (
                <tr
                  key={q.decision.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight">{q.studentName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.recommenderName ? `Oleh ${q.recommenderName}` : "Wali kelas"}
                      {q.studentNumber ? ` • NIS ${q.studentNumber}` : ""}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {q.decision.class_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={REC_TONES[q.decision.recommendation ?? ""] ?? "neutral"}>
                      {q.decision.recommendation
                        ? (PROMOTION_RECOMMENDATION_LABELS[
                            q.decision.recommendation as keyof typeof PROMOTION_RECOMMENDATION_LABELS
                          ] ?? q.decision.recommendation)
                        : "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/kenaikan-kelas/siswa/${q.decision.student_id}?tahun=${encodeURIComponent(year)}`}
                      className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                    >
                      Periksa
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Panel>

      <Panel
        title={`Riwayat Keputusan — ${history.length} ditetapkan`}
        description={`Tahun pelajaran ${year}. Keputusan final tidak bisa diubah, kecuali dibuka kembali secara resmi.`}
      >
        {history.length === 0 ? (
          <Empty
            icon={GraduationCap}
            title="Belum ada keputusan"
            description="Riwayat akan muncul di sini setelah Kepala Sekolah menetapkan keputusan."
          />
        ) : (
          <TableShell>
            <TableHead>
              <Th>Siswa</Th>
              <Th>Kelas</Th>
              <Th>Keputusan</Th>
              <Th className="text-right">Aksi</Th>
            </TableHead>
            <tbody>
              {history.map((h) => (
                <tr
                  key={h.decision.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium">{h.studentName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {h.decision.class_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={h.decision.final_decision === "naik" ? "success" : "danger"}>
                      {h.decision.final_decision
                        ? (PROMOTION_DECISION_LABELS[
                            h.decision.final_decision as keyof typeof PROMOTION_DECISION_LABELS
                          ] ?? h.decision.final_decision)
                        : "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/kenaikan-kelas/siswa/${h.decision.student_id}?tahun=${encodeURIComponent(year)}`}
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
      </Panel>

      {execution && (
        <Panel
          title="Terapkan ke Tahun Ajaran"
          description="Pindahkan siswa yang diputuskan Naik ke tahun tujuan. Hanya jalan bila semua siswa sudah ditetapkan."
        >
          <ApplyDecisionsPanel preview={execution} />
        </Panel>
      )}
    </div>
  );
}
