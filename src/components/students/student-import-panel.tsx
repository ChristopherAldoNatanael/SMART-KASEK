"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
} from "lucide-react";
import { importStudentsAction } from "@/app/(shell)/students/actions";
import {
  STUDENT_TEMPLATE_CSV,
  STUDENT_TEMPLATE_FILENAME,
  STUDENT_TEMPLATE_GUIDE,
  parseStudentsCsv,
  rowsToStudents,
  type StudentImportIssue,
  type StudentImportRow,
} from "@/lib/students";
import { toast } from "@/components/toaster";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const inputClass =
  "min-h-[48px] w-full rounded-lg border bg-background px-3 py-2.5 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

function ImportButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      <FileUp className="h-5 w-5" aria-hidden />
      {pending ? "Memasukkan data..." : "Masukkan data ini"}
    </button>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const TEMPLATE_HEADERS = [
  "nama_lengkap",
  "nis",
  "kelas",
  "jenis_kelamin",
  "status",
];

/**
 * Import siswa bertahap dan jelas:
 * 1) unduh contoh → 2) pilih file + tahun ajaran → 3) periksa hasil
 * baca → 4) masukkan data. Duplikat otomatis dilewati.
 */
export default function StudentImportPanel({
  defaultYear,
  yearOptions,
}: {
  defaultYear: string;
  yearOptions: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [targetYear, setTargetYear] = useState(defaultYear);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [valid, setValid] = useState<StudentImportRow[]>([]);
  const [issues, setIssues] = useState<StudentImportIssue[]>([]);
  const [parsed, setParsed] = useState(false);

  const [importState, importAction] = useFormState(importStudentsAction, {
    ok: false,
    error: null,
    message: null,
  });

  const lastImport = useRef(importState);
  useEffect(() => {
    if (lastImport.current !== importState) {
      lastImport.current = importState;
      if (importState.error) {
        toast.error("Belum berhasil mengimport", importState.error);
      } else if (importState.ok) {
        toast.success(
          "Import selesai",
          importState.message ?? "Data siswa sudah masuk."
        );
        resetFile();
        startTransition(() => router.refresh());
      }
    }
  });

  function resetFile() {
    setFileName(null);
    setValid([]);
    setIssues([]);
    setParsed(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadCsvTemplate() {
    downloadBlob(
      new Blob([STUDENT_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }),
      STUDENT_TEMPLATE_FILENAME
    );
    toast.success(
      "Contoh CSV terunduh",
      "Buka file tersebut, isi data siswa, simpan, lalu pilih file di Langkah 2."
    );
  }

  async function downloadExcelTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "template-data-siswa.xlsx");
    toast.success(
      "Contoh Excel terunduh",
      "Buka file tersebut, isi data siswa, simpan, lalu pilih file di Langkah 2."
    );
  }

  async function handleFile(file: File | undefined) {
    resetFile();
    if (!file) return;
    const lower = file.name.toLowerCase();
    const isCsv = lower.endsWith(".csv");
    const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    if (!isCsv && !isExcel) {
      toast.error(
        "File tidak didukung",
        `“${file.name}” bukan CSV/Excel. Unduh contoh di Langkah 1 lalu isi.`
      );
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(
        "File terlalu besar",
        "Maksimal 5 MB. Bagi menjadi beberapa file bila perlu."
      );
      return;
    }

    setParsing(true);
    setFileName(file.name);
    try {
      if (isCsv) {
        const text = await file.text();
        const result = parseStudentsCsv(text);
        setValid(result.valid);
        setIssues(result.issues);
      } else {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) throw new Error("empty");
        const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: "",
          raw: false,
        });
        const strings = grid.map((r) =>
          (Array.isArray(r) ? r : []).map((c) => String(c ?? "").trim())
        );
        const nonEmpty = strings.filter((r) => r.some((c) => c !== ""));
        if (nonEmpty.length < 2) {
          setValid([]);
          setIssues([
            {
              rowNumber: 1,
              message:
                "Hanya ada judul tanpa isi. Tambahkan minimal 1 baris data siswa di bawah judul.",
            },
          ]);
        } else {
          const result = rowsToStudents(nonEmpty[0], nonEmpty.slice(1));
          setValid(result.valid);
          setIssues(result.issues);
        }
      }
      setParsed(true);
    } catch {
      setValid([]);
      setIssues([
        {
          rowNumber: 0,
          message:
            "File tidak bisa dibaca. Pastikan file tidak rusak dan berisi tabel data siswa.",
        },
      ]);
      setParsed(true);
    } finally {
      setParsing(false);
    }
  }

  const rowsJson = JSON.stringify(valid);
  const shownIssues = issues.slice(0, 10);
  const sampleRows = valid.slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Langkah 1 */}
      <div className="rounded-xl border border-sky-600/20 bg-sky-50 p-4 text-[15px] leading-relaxed text-sky-900">
        <p className="font-bold">Langkah 1 — Unduh contoh file</p>
        <p className="mt-1">
          Isi data siswa di file contoh ini. Baris pertama (judul kolom)
          jangan diubah.
        </p>
        <div className="mt-3 grid gap-2 sm:flex">
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border-2 border-sky-700 bg-white px-4 py-2.5 text-[15px] font-semibold text-sky-800 transition-colors hover:bg-sky-100"
          >
            <Download className="h-5 w-5" aria-hidden />
            Contoh CSV
          </button>
          <button
            type="button"
            onClick={downloadExcelTemplate}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border-2 border-sky-700 bg-white px-4 py-2.5 text-[15px] font-semibold text-sky-800 transition-colors hover:bg-sky-100"
          >
            <FileSpreadsheet className="h-5 w-5" aria-hidden />
            Contoh Excel
          </button>
        </div>
        <details className="mt-3 rounded-lg bg-white/70 px-3 py-2">
          <summary className="cursor-pointer py-1 font-semibold">
            Lihat aturan tiap kolom
          </summary>
          <ul className="mt-1 space-y-1.5 pb-1">
            {STUDENT_TEMPLATE_GUIDE.map((g) => (
              <li key={g.column}>
                <strong>{g.column}</strong> — {g.rule}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* Langkah 2 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="imp-tahun" className="text-[15px] font-semibold">
            Langkah 2a — Masukkan ke tahun ajaran
          </label>
          <select
            id="imp-tahun"
            value={targetYear}
            onChange={(e) => setTargetYear(e.target.value)}
            className={inputClass}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="imp-file" className="text-[15px] font-semibold">
            Langkah 2b — Pilih file yang sudah diisi
          </label>
          <input
            id="imp-file"
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-base file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground sm:text-sm"
          />
          <p className="text-xs text-muted-foreground">
            CSV atau Excel, maksimal 5 MB.
          </p>
        </div>
      </div>

      {/* Langkah 3 — hasil baca */}
      {parsing && (
        <p role="status" className="text-[15px] text-muted-foreground">
          Membaca file, tunggu sebentar...
        </p>
      )}

      {parsed && !parsing && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="font-bold">
            Langkah 3 — Periksa hasil baca file “{fileName}”
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Siap masuk: {valid.length}
            </span>
            {issues.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Bermasalah: {issues.length} (dilewati)
              </span>
            )}
          </div>

          {issues.length > 0 && (
            <ul className="space-y-1.5 rounded-lg border border-amber-600/25 bg-amber-50 p-3 text-sm text-amber-900">
              {shownIssues.map((issue, i) => (
                <li key={i}>
                  <strong>Baris {issue.rowNumber}:</strong> {issue.message}
                </li>
              ))}
              {issues.length > shownIssues.length && (
                <li>
                  ... dan {issues.length - shownIssues.length} baris bermasalah
                  lainnya (semuanya dilewati).
                </li>
              )}
            </ul>
          )}

          {sampleRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Nama</th>
                    <th className="px-3 py-2 font-semibold">NIS</th>
                    <th className="px-3 py-2 font-semibold">Kelas</th>
                    <th className="px-3 py-2 font-semibold">L/P</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{r.full_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.student_number ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.class_name ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.gender === "male" ? "L" : r.gender === "female" ? "P" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {valid.length > sampleRows.length && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Menampilkan {sampleRows.length} dari {valid.length} baris siap
                  masuk.
                </p>
              )}
            </div>
          )}

          {valid.length === 0 && (
            <p className="text-[15px] text-muted-foreground">
              Tidak ada baris yang bisa dimasukkan. Perbaiki file sesuai pesan
              di atas, lalu pilih ulang filenya.
            </p>
          )}

          {/* Langkah 4 */}
          {valid.length > 0 && (
            <form action={importAction} className="flex flex-col gap-2 pt-1">
              <input type="hidden" name="academicYear" value={targetYear} />
              <input type="hidden" name="rowsJson" value={rowsJson} />
              <p className="text-sm text-muted-foreground">
                Langkah 4 — Data yang sama (nama/NIS) tidak akan masuk dua kali.
              </p>
              <div>
                <ImportButton disabled={false} />
              </div>
            </form>
          )}
        </div>
      )}

      {!parsed && !parsing && (
        <p className="text-sm text-muted-foreground">
          Hasil baca file akan muncul di sini setelah file dipilih.
        </p>
      )}
    </div>
  );
}
