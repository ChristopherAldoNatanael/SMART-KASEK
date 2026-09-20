import Link from "next/link";
import { CalendarDays, ClipboardList, Printer } from "lucide-react";
import { requirePrincipal } from "@/lib/permissions";
import { getProgramYears, listPrograms } from "@/services/program.service";
import {
  PROGRAM_STATUS_LABELS,
  formatActivityDate,
  formatRupiah,
  semesterLabel,
} from "@/lib/programs";
import { currentAcademicYear } from "@/lib/students";
import { currentSemester } from "@/lib/programs";
import { Badge, Empty, PageHeader, Panel } from "@/components/common";
import {
  CreateProgramForm,
  EditProgramForm,
  ProgramStatusButton,
} from "@/components/programs/program-forms";
import ProgramFilterBar from "@/components/programs/program-filter";
import DeleteButton from "@/components/delete-button";
import { deleteProgramAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_TONES: Record<string, "success" | "warning" | "info" | "neutral"> = {
  planned: "info",
  ongoing: "warning",
  completed: "success",
  cancelled: "neutral",
};

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams?: Promise<{ semester?: string; tahun?: string }>;
}) {
  // Khusus Kepala Sekolah (admin lolos hierarki). Guru dialihkan dashboard.
  await requirePrincipal();

  const query = (await searchParams) ?? {};
  const semester: 1 | 2 = query.semester === "2" ? 2 : 1;
  const fallbackYear = currentAcademicYear();

  let years: string[] = [fallbackYear];
  try {
    years = await getProgramYears();
  } catch {
    years = [fallbackYear];
  }
  const academicYear =
    query.tahun?.trim() && years.includes(query.tahun.trim())
      ? query.tahun.trim()
      : years.includes(fallbackYear)
        ? fallbackYear
        : years[0];

  let programs: Awaited<ReturnType<typeof listPrograms>> = [];
  let loadError: string | null = null;
  try {
    programs = await listPrograms({ semester, academicYear });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Gagal memuat program";
  }

  const percents = programs
    .map((p) => p.progress)
    .filter((v): v is number => v !== null);
  const overall =
    percents.length > 0
      ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
      : null;

  const cetakHref = `/programs/cetak?semester=${semester}&tahun=${encodeURIComponent(academicYear)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manajemen • Program Sekolah"
        title={`Program Kegiatan ${semesterLabel(semester)}`}
        description={`Tahun pelajaran ${academicYear} — tanggal dan jenis kegiatan tiap semester, seperti dokumen kalender sekolah.`}
        actions={
          <Link
            href={cetakHref}
            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Cetak dokumen
          </Link>
        }
      />

      {/* Filter semester + tahun pelajaran */}
      <ProgramFilterBar semester={semester} academicYear={academicYear} years={years} />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {/* Ringkasan angka */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Rata-rata jalan</span>
          <span className="tnum text-lg font-bold">{overall !== null ? `${overall}%` : "—"}</span>
        </div>
        {[
          { label: "Kegiatan", value: programs.length },
          {
            label: "Berjalan",
            value: programs.filter((p) => p.status === "ongoing").length,
          },
          {
            label: "Selesai",
            value: programs.filter((p) => p.status === "completed").length,
          },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="tnum text-lg font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabel dokumen: TANGGAL | JENIS KEGIATAN */}
      {programs.length === 0 ? (
        <Empty
          icon={semester === currentSemester() ? ClipboardList : CalendarDays}
          title={`Belum ada kegiatan ${semesterLabel(semester)} ${academicYear}`}
          description="Tambahkan kegiatan pertama lewat form di bawah — misalnya MPLS, STS, atau SAS."
        />
      ) : (
        <Panel
          title={`Daftar kegiatan — ${programs.length} kegiatan`}
          description="Urut dari tanggal paling awal. Persen dihitung otomatis dari status dan tanggal."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="w-10 px-3 py-2.5 font-semibold">No</th>
                  <th className="w-56 px-3 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-3 py-2.5 font-semibold">Jenis Kegiatan</th>
                  <th className="w-36 px-3 py-2.5 font-semibold">Status</th>
                  <th className="w-44 px-3 py-2.5 font-semibold">Kelola</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b align-top transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="tnum px-3 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="tnum whitespace-nowrap px-3 py-3 font-semibold">
                      {formatActivityDate(p.start_date, p.end_date)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold leading-snug">{p.name}</p>
                      {p.category && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{p.category}</p>
                      )}
                      {p.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                      )}
                      <p className="tnum mt-1 text-xs text-muted-foreground">
                        {formatRupiah(p.budget)}
                        {p.progress !== null && (
                          <>
                            {" "}• Sudah jalan {p.progressEstimated ? "~" : ""}
                            {p.progress}%
                          </>
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={STATUS_TONES[p.status] ?? "neutral"}>
                        {PROGRAM_STATUS_LABELS[p.status as keyof typeof PROGRAM_STATUS_LABELS]}
                      </Badge>
                      {p.progress !== null && (
                        <div
                          className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={p.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progres ${p.name}`}
                        >
                          <div
                            className={
                              p.status === "completed"
                                ? "h-full rounded-full bg-emerald-600"
                                : "h-full rounded-full bg-brand"
                            }
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.status === "planned" && (
                          <ProgramStatusButton
                            programId={p.id}
                            status="ongoing"
                            label="Mulai"
                            tone="primary"
                          />
                        )}
                        {p.status === "ongoing" && (
                          <>
                            <ProgramStatusButton
                              programId={p.id}
                              status="completed"
                              label="Selesai"
                              tone="primary"
                            />
                            <ProgramStatusButton
                              programId={p.id}
                              status="cancelled"
                              label="Batal"
                              tone="danger"
                            />
                          </>
                        )}
                        {p.status === "completed" && (
                          <ProgramStatusButton
                            programId={p.id}
                            status="ongoing"
                            label="Buka lagi"
                          />
                        )}
                        {p.status === "cancelled" && (
                          <ProgramStatusButton
                            programId={p.id}
                            status="planned"
                            label="Aktifkan"
                          />
                        )}
                        <EditProgramForm program={p} yearOptions={years} />
                        <DeleteButton
                          action={deleteProgramAction}
                          idName="programId"
                          idValue={p.id}
                          label="Hapus"
                          confirmText={`Hapus "${p.name}" dari daftar ${semesterLabel(semester)} ${academicYear}?`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel
        title="Tambah kegiatan"
        description={`Masuk ke ${semesterLabel(semester)} tahun ${academicYear}. Mulai sebagai Rencana.`}
      >
        <CreateProgramForm
          defaultSemester={semester}
          defaultAcademicYear={academicYear}
          yearOptions={years}
        />
      </Panel>
    </div>
  );
}
