import { INSTRUMENT_MAX_SCORE } from "@/lib/supervision-instrument";
import type { SupervisionDocType } from "@/lib/supervision-docs";
import { Badge } from "@/components/common";

const GRADE_TONES: Record<string, "success" | "info" | "warning" | "danger"> = {
  "Amat Baik": "success",
  Baik: "info",
  Cukup: "warning",
  Kurang: "danger",
};

export type InstrumentResultItem = {
  docType: SupervisionDocType;
  label: string;
  present: boolean;
  score: number | null;
  note: string | null;
};

/**
 * Ringkasan hasil penilaian instrumen (read-only): identitas,
 * jumlah skor, nilai, kategori, rincian 12 aspek, evaluasi.
 * Ditampilkan ke guru bila final; ke kepsek bila final (form tetap
 * tersedia di bawah untuk koreksi yang mengembalikan ke draft).
 */
export default function SupervisionInstrumentResult({
  teacherName,
  className,
  dateLabel,
  totalScore,
  finalValue,
  grade,
  status,
  evaluation,
  items,
}: {
  teacherName: string;
  className: string | null;
  dateLabel: string;
  totalScore: number;
  finalValue: number;
  grade: string;
  status: string;
  evaluation: string | null;
  items: InstrumentResultItem[];
}) {
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
            Kelas
          </dt>
          <dd className="mt-0.5 font-semibold">{className ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hari / Tanggal
          </dt>
          <dd className="mt-0.5 font-semibold">{dateLabel}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4">
        <div>
          <p className="text-xs text-muted-foreground">Jumlah Skor</p>
          <p className="tnum text-2xl font-bold">
            {totalScore}
            <span className="text-sm font-medium text-muted-foreground">
              /{INSTRUMENT_MAX_SCORE}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Nilai</p>
          <p className="tnum text-2xl font-bold">
            {Number(finalValue).toLocaleString("id-ID", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Kategori</p>
          <p className="mt-1">
            <Badge tone={GRADE_TONES[grade] ?? "neutral"}>{grade}</Badge>
          </p>
        </div>
        <div className="ml-auto">
          <Badge tone={status === "final" ? "success" : "warning"}>
            {status === "final" ? "Selesai dinilai" : "Draft"}
          </Badge>
        </div>
      </div>

      <ol className="divide-y rounded-xl border bg-card">
        {items.map((item, index) => (
          <li key={item.docType} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  #{index + 1} • {item.present ? "Ada" : "Tidak"}
                </p>
                <p className="mt-0.5 font-medium leading-snug">{item.label}</p>
                {item.note && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Catatan: </span>
                    {item.note}
                  </p>
                )}
              </div>
              <span className="tnum shrink-0 text-xl font-bold">
                {item.score ?? "—"}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {evaluation && (
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-sm font-semibold">Evaluasi / Tindak Lanjut</h4>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {evaluation}
          </p>
        </div>
      )}
    </div>
  );
}
