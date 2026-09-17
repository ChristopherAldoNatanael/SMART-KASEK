import {
  Building2,
  ClipboardCheck,
  FileText,
  ListChecks,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/common";
import {
  MANAGERIAL_I1_ITEMS,
  MANAGERIAL_I2_ITEMS,
  MANAGERIAL_I3_ITEMS,
  MANAGERIAL_I1_MAX,
  MANAGERIAL_I3_MAX,
} from "@/lib/supervision-managerial";
import { itemsOf, scoreLabel } from "./managerial-progress";
import type { Database } from "@/types/database";

type ManagerialAssessment =
  Database["public"]["Tables"]["supervision_managerial_assessments"]["Row"];
type ManagerialItem =
  Database["public"]["Tables"]["supervision_managerial_items"]["Row"];

const GRADE_TONES: Record<string, "success" | "info" | "warning" | "danger"> = {
  "Amat Baik": "success",
  Baik: "info",
  Cukup: "warning",
  Kurang: "danger",
};

function fmt(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Hasil Supervisi Manajerial (read-only): ringkasan I1/I2/I3 + NM +
 * seluruh indikator beserta skor/Ada-Tidak dan catatan supervisor.
 */
export default function ManagerialResult({
  teacherName,
  subject,
  nip,
  schoolName,
  academicYear,
  period,
  supervisorName,
  statusLabel,
  assessment,
  items,
}: {
  teacherName: string;
  subject: string | null;
  nip: string | null;
  schoolName: string | null;
  academicYear: string | null;
  period: string | null;
  supervisorName: string;
  statusLabel: string;
  assessment: ManagerialAssessment | null;
  items: ManagerialItem[];
}) {
  const byKey = new Map(items.map((i) => [`${i.instrument}:${i.item_key}`, i]));

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nama Guru
          </dt>
          <dd className="mt-0.5 font-semibold">{teacherName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mata Pelajaran
          </dt>
          <dd className="mt-0.5 font-semibold">{subject ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            NIP
          </dt>
          <dd className="mt-0.5 font-semibold">{nip ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sekolah
          </dt>
          <dd className="mt-0.5 font-semibold">{schoolName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tahun Pelajaran
          </dt>
          <dd className="mt-0.5 font-semibold">{academicYear ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Periode Supervisi
          </dt>
          <dd className="mt-0.5 font-semibold">{period ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Supervisor
          </dt>
          <dd className="mt-0.5 font-semibold">{supervisorName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </dt>
          <dd className="mt-0.5 font-semibold">{statusLabel}</dd>
        </div>
      </dl>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            Instrumen 1 — Nilai
          </p>
          <p className="tnum mt-1 text-3xl font-bold">
            {assessment ? fmt(assessment.i1_value) : "—"}
          </p>
          <p className="tnum mt-0.5 text-xs text-muted-foreground">
            {assessment ? `Skor ${assessment.i1_total} dari ${MANAGERIAL_I1_MAX}` : "Belum dinilai"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Instrumen 2 — Nilai
          </p>
          <p className="tnum mt-1 text-3xl font-bold">
            {assessment ? fmt(assessment.i2_value) : "—"}
          </p>
          <p className="tnum mt-0.5 text-xs text-muted-foreground">
            {assessment ? `${assessment.i2_present} dari 10 yang “Ada”` : "Belum dinilai"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Instrumen 3 — Nilai
          </p>
          <p className="tnum mt-1 text-3xl font-bold">
            {assessment ? fmt(assessment.i3_value) : "—"}
          </p>
          <p className="tnum mt-0.5 text-xs text-muted-foreground">
            {assessment ? `Skor ${assessment.i3_total} dari ${MANAGERIAL_I3_MAX}` : "Belum dinilai"}
          </p>
        </div>
        <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.04] p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            Nilai Akhir
          </p>
          <p className="tnum mt-1 text-3xl font-bold">
            {assessment?.overall_value != null ? fmt(assessment.overall_value) : "—"}
          </p>
          <p className="mt-1.5">
            {assessment ? (
              <Badge tone={GRADE_TONES[assessment.grade] ?? "neutral"}>
                {assessment.grade}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Belum dinilai</span>
            )}
          </p>
        </div>
      </div>

      <section aria-label="Rincian Instrumen 1" className="rounded-xl border bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <Building2 className="h-4 w-4 text-brand" aria-hidden />
          <h4 className="text-[15px] font-bold">
            Instrumen 1 — Kelengkapan Administrasi Kelas
          </h4>
          {assessment && (
            <Badge tone={assessment.i1_status === "final" ? "success" : "warning"}>
              {assessment.i1_status === "final" ? "Sudah selesai" : "Masih draft"}
            </Badge>
          )}
        </header>
        <ol className="divide-y">
          {MANAGERIAL_I1_ITEMS.map((def, index) => {
            const found = byKey.get(`i1:${def.key}`);
            return (
              <li key={def.key} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      #{index + 1}
                    </p>
                    <p className="mt-0.5 font-medium leading-snug">{def.label}</p>
                    {def.detail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{def.detail}</p>
                    )}
                    {found?.note && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Catatan: </span>
                        {found.note}
                      </p>
                    )}
                  </div>
                  <span className="tnum shrink-0 text-sm font-bold">
                    {scoreLabel(found?.score ?? null)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Rincian Instrumen 2" className="rounded-xl border bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <ListChecks className="h-4 w-4 text-brand" aria-hidden />
          <h4 className="text-[15px] font-bold">
            Instrumen 2 — Perencanaan Kegiatan Pembelajaran
          </h4>
          {assessment && (
            <Badge tone={assessment.i2_status === "final" ? "success" : "warning"}>
              {assessment.i2_status === "final" ? "Sudah selesai" : "Masih draft"}
            </Badge>
          )}
        </header>
        <ol className="divide-y">
          {MANAGERIAL_I2_ITEMS.map((def, index) => {
            const found = byKey.get(`i2:${def.key}`);
            return (
              <li key={def.key} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      #{index + 1} •{" "}
                      {found?.present === true
                        ? "Ada"
                        : found?.present === false
                          ? "Tidak"
                          : "—"}
                    </p>
                    <p className="mt-0.5 font-medium leading-snug">{def.label}</p>
                    {found?.note && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Catatan: </span>
                        {found.note}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Rincian Instrumen 3" className="rounded-xl border bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <FileText className="h-4 w-4 text-brand" aria-hidden />
          <h4 className="text-[15px] font-bold">
            Instrumen 3 — Penyusunan ATP/Silabus
          </h4>
          {assessment && (
            <Badge tone={assessment.i3_status === "final" ? "success" : "warning"}>
              {assessment.i3_status === "final" ? "Sudah selesai" : "Masih draft"}
            </Badge>
          )}
        </header>
        <ol className="divide-y">
          {MANAGERIAL_I3_ITEMS.map((def, index) => {
            const found = byKey.get(`i3:${def.key}`);
            return (
              <li key={def.key} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      #{index + 1}
                    </p>
                    <p className="mt-0.5 font-medium leading-snug">{def.label}</p>
                    {found?.note && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Catatan: </span>
                        {found.note}
                      </p>
                    )}
                  </div>
                  <span className="tnum shrink-0 text-sm font-bold">
                    {scoreLabel(found?.score ?? null)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {itemsOf(items, "i1").length === 0 &&
        itemsOf(items, "i2").length === 0 &&
        itemsOf(items, "i3").length === 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-[15px] text-muted-foreground">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              Penilaian belum dimulai. Kepala Sekolah mengisi{" "}
              <strong>Instrumen 1, 2, dan 3</strong> pada bagian di bawah ini —
              hasilnya akan muncul otomatis di sini.
            </p>
          </div>
        )}
    </div>
  );
}
