import {
  Building2,
  ChevronDown,
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
import { itemsOf } from "./managerial-progress";
import { SCORE_LABELS } from "@/lib/supervision-managerial";
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

const SCORE_TONES: Record<number, "success" | "info" | "warning" | "danger"> = {
  4: "success",
  3: "info",
  2: "warning",
  1: "danger",
};

/** Pil skor ringkas: angka + arti saat disentuh/hover. */
function ScorePill({ value }: { value: number | null }) {
  if (value === null) {
    return <Badge tone="neutral">—</Badge>;
  }
  return (
    <span title={SCORE_LABELS[value] ?? ""}>
      <Badge tone={SCORE_TONES[value] ?? "neutral"}>{value}</Badge>
    </span>
  );
}

/** Pil Ada/Tidak ringkas. */
function PresentPill({ present }: { present: boolean | null }) {
  if (present === true) return <Badge tone="success">Ada</Badge>;
  if (present === false) return <Badge tone="warning">Tidak</Badge>;
  return <Badge tone="neutral">—</Badge>;
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
  const i1Rows = itemsOf(items, "i1");
  const i2Rows = itemsOf(items, "i2");
  const i3Rows = itemsOf(items, "i3");
  const i1Answered = i1Rows.filter((i) => i.score != null).length;
  const i1Weak = i1Rows.filter((i) => i.score != null && i.score <= 2).length;
  const i2Weak = i2Rows.filter((i) => i.present === false).length;
  const i3Answered = i3Rows.filter((i) => i.score != null).length;
  const i3Weak = i3Rows.filter((i) => i.score != null && i.score <= 2).length;

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

      <details className="group rounded-xl border bg-card">
        <summary
          aria-label="Rincian Instrumen 1 — Kelengkapan Administrasi Kelas. Ketuk untuk buka atau tutup."
          className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-brand/50 [&::-webkit-details-marker]:hidden"
        >
          <Building2 className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold">
              Instrumen 1 — Administrasi Kelas
            </span>
            <span className="tnum mt-0.5 block text-xs text-muted-foreground">
              {assessment
                ? `Nilai ${fmt(assessment.i1_value)} • ${i1Answered}/${MANAGERIAL_I1_ITEMS.length} dinilai`
                : "Belum dinilai"}
              {i1Weak > 0 && ` • ${i1Weak} perlu perhatian`}
            </span>
          </span>
          {assessment && (
            <Badge tone={assessment.i1_status === "final" ? "success" : "warning"}>
              {assessment.i1_status === "final" ? "Selesai" : "Draft"}
            </Badge>
          )}
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ol className="divide-y border-t">
          {MANAGERIAL_I1_ITEMS.map((def, index) => {
            const found = byKey.get(`i1:${def.key}`);
            return (
              <li key={def.key} className="flex items-start gap-3 px-4 py-2.5">
                <span className="tnum mt-0.5 w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">{def.label}</span>
                  {def.detail && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {def.detail}
                    </span>
                  )}
                  {found?.note && (
                    <span className="mt-1 block border-l-2 border-brand/30 pl-2 text-sm text-muted-foreground">
                      {found.note}
                    </span>
                  )}
                </span>
                <ScorePill value={found?.score ?? null} />
              </li>
            );
          })}
        </ol>
      </details>

      <details className="group rounded-xl border bg-card">
        <summary
          aria-label="Rincian Instrumen 2 — Perencanaan Kegiatan Pembelajaran. Ketuk untuk buka atau tutup."
          className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-brand/50 [&::-webkit-details-marker]:hidden"
        >
          <ListChecks className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold">
              Instrumen 2 — Perencanaan
            </span>
            <span className="tnum mt-0.5 block text-xs text-muted-foreground">
              {assessment
                ? `${assessment.i2_present}/${MANAGERIAL_I2_ITEMS.length} Ada • Nilai ${fmt(assessment.i2_value)}`
                : "Belum dinilai"}
              {i2Weak > 0 && ` • ${i2Weak} belum ada`}
            </span>
          </span>
          {assessment && (
            <Badge tone={assessment.i2_status === "final" ? "success" : "warning"}>
              {assessment.i2_status === "final" ? "Selesai" : "Draft"}
            </Badge>
          )}
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ol className="divide-y border-t">
          {MANAGERIAL_I2_ITEMS.map((def, index) => {
            const found = byKey.get(`i2:${def.key}`);
            return (
              <li key={def.key} className="flex items-start gap-3 px-4 py-2.5">
                <span className="tnum mt-0.5 w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">{def.label}</span>
                  {found?.note && (
                    <span className="mt-1 block border-l-2 border-brand/30 pl-2 text-sm text-muted-foreground">
                      {found.note}
                    </span>
                  )}
                </span>
                <PresentPill present={found?.present ?? null} />
              </li>
            );
          })}
        </ol>
      </details>

      <details className="group rounded-xl border bg-card">
        <summary
          aria-label="Rincian Instrumen 3 — Penyusunan ATP/Silabus. Ketuk untuk buka atau tutup."
          className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-brand/50 [&::-webkit-details-marker]:hidden"
        >
          <FileText className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold">
              Instrumen 3 — ATP/Silabus
            </span>
            <span className="tnum mt-0.5 block text-xs text-muted-foreground">
              {assessment
                ? `Nilai ${fmt(assessment.i3_value)} • ${i3Answered}/${MANAGERIAL_I3_ITEMS.length} dinilai`
                : "Belum dinilai"}
              {i3Weak > 0 && ` • ${i3Weak} perlu perhatian`}
            </span>
          </span>
          {assessment && (
            <Badge tone={assessment.i3_status === "final" ? "success" : "warning"}>
              {assessment.i3_status === "final" ? "Selesai" : "Draft"}
            </Badge>
          )}
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ol className="divide-y border-t">
          {MANAGERIAL_I3_ITEMS.map((def, index) => {
            const found = byKey.get(`i3:${def.key}`);
            return (
              <li key={def.key} className="flex items-start gap-3 px-4 py-2.5">
                <span className="tnum mt-0.5 w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">{def.label}</span>
                  {found?.note && (
                    <span className="mt-1 block border-l-2 border-brand/30 pl-2 text-sm text-muted-foreground">
                      {found.note}
                    </span>
                  )}
                </span>
                <ScorePill value={found?.score ?? null} />
              </li>
            );
          })}
        </ol>
      </details>

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
