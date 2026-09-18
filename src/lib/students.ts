/**
 * Helper murni Data Siswa (dipakai client maupun server).
 *
 * - Tahun ajaran mengikuti kalender sekolah Indonesia (Juli–Juni).
 * - Parser CSV toleran: koma/titik-koma, tanda kutip, BOM.
 * - Header fleksibel: "Nama Lengkap", "NIS", "Kelas", "L/P", dst.
 * - Tidak ada data dummy — semua dari input pengguna/database.
 */

export type StudentGenderValue = "male" | "female";
export type StudentStatusValue =
  | "active"
  | "graduated"
  | "transferred"
  | "dropped";

export type StudentImportRow = {
  full_name: string;
  student_number: string | null;
  class_name: string | null;
  gender: StudentGenderValue | null;
  status: StudentStatusValue;
};

export type StudentImportIssue = {
  /** Nomor baris di file (1 = header). */
  rowNumber: number;
  message: string;
};

export const STUDENT_GENDER_LABELS: Record<StudentGenderValue, string> = {
  male: "Laki-laki",
  female: "Perempuan",
};

export const STUDENT_STATUS_LABELS: Record<StudentStatusValue, string> = {
  active: "Aktif",
  graduated: "Lulus",
  transferred: "Pindahan",
  dropped: "Keluar",
};

/* ------------------------------- Absensi -------------------------------- */

export type AttendanceStatus = "hadir" | "izin" | "sakit" | "alpa";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "hadir",
  "izin",
  "sakit",
  "alpa",
];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Alpa",
};

export const ATTENDANCE_SHORT: Record<AttendanceStatus, string> = {
  hadir: "H",
  izin: "I",
  sakit: "S",
  alpa: "A",
};

/** Tanggal hari ini format YYYY-MM-DD (default pilihan tanggal absensi). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Bulan berjalan format YYYY-MM (default filter rekap). */
export function currentMonthISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Tahun ajaran untuk suatu bulan ("2027-01" → "2026/2027").
 * Dipakai agar rekap Januari tetap masuk tahun ajaran berjalan.
 */
export function schoolYearForMonth(month: string): string {
  const m = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return currentAcademicYear();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return mo >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** Batas tanggal (inklusif) untuk satu bulan "YYYY-MM". */
export function monthRange(month: string): { from: string; to: string } {
  const m = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) {
    const cur = currentMonthISO();
    return monthRange(cur);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const lastDay = new Date(y, mo, 0).getDate();
  const dd = String(lastDay).padStart(2, "0");
  return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${dd}` };
}

/**
 * Daftar kelas yang boleh dilihat guru pada suatu tahun ajaran
 * (wali + yang diajar). Null = boleh semua (Kepala Sekolah/Admin).
 */
export function allowedClassesFor(
  access: {
    homeroom: string | null;
    assignedByYear: Record<string, string[]>;
  } | null,
  year: string
): string[] | null {
  if (!access) return null;
  const set = new Set<string>();
  if (access.homeroom) set.add(access.homeroom);
  for (const c of access.assignedByYear[year] ?? []) set.add(c);
  return Array.from(set);
}

/** "2026-09" → "September 2026" untuk judul yang mudah dibaca. */
export function monthLabelID(month: string): string {
  const m = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return month;
  const names = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${names[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** Tahun ajaran berjalan. Juli–Juni, mis. Sep 2026 → "2026/2027". */
export function currentAcademicYear(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** Tahun ajaran depan (untuk persiapan/kenaikan kelas). */
export function nextAcademicYear(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y + 1}/${y + 2}` : `${y}/${y + 1}`;
}

/** "2026/2027" → "2027/2028". Null bila format tak dikenal. */
export function yearAfter(year: string): string | null {
  const m = year.trim().match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
}

/**
 * Daftar tahun untuk filter: tahun di database + tahun berjalan +
 * tahun depan (agar bisa pindah ke tahun depan walau masih kosong),
 * terbaru dulu.
 */
export function academicYearOptions(existing: (string | null)[]): string[] {
  const set = new Set<string>();
  for (const y of existing) {
    if (y && y.trim()) set.add(y.trim());
  }
  set.add(currentAcademicYear());
  set.add(nextAcademicYear());
  return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
}

const ROMAN_GRADES = ["I", "II", "III", "IV", "V", "VI"] as const;

/** Ambil angka romawi tingkat dari nama kelas ("I-A" → "I"). Null bila bukan I–VI. */
function gradeNumeral(className: string): string | null {
  const cleaned = className
    .trim()
    .replace(/^kelas\s+/i, "")
    .toUpperCase();
  const m = cleaned.match(/^([IVX]+)(?=[\s\-–_]|$)/);
  if (!m) return null;
  return (ROMAN_GRADES as readonly string[]).includes(m[1]) ? m[1] : null;
}

/**
 * Saran kelas tujuan kenaikan ("I-A" → "II-A", "III-B" → "IV-B").
 * Null untuk kelas VI (lulus) atau nama yang tidak berpola tingkat.
 */
export function suggestNextClass(className: string): string | null {
  const cleaned = className.trim().replace(/^kelas\s+/i, "");
  const numeral = gradeNumeral(className);
  if (!numeral) return null;
  const idx = ROMAN_GRADES.indexOf(numeral as (typeof ROMAN_GRADES)[number]);
  if (idx < 0 || idx >= ROMAN_GRADES.length - 1) return null;
  return cleaned.replace(/^[IVX]+/i, ROMAN_GRADES[idx + 1]);
}

/** True untuk kelas tingkat akhir (VI-*) — kandidat diluluskan, bukan naik. */
export function isFinalYearClass(className: string): boolean {
  return gradeNumeral(className) === "VI";
}

/* ------------------------------- Template ------------------------------ */

export const STUDENT_TEMPLATE_FILENAME = "template-data-siswa.csv";

export const STUDENT_TEMPLATE_CSV =
  "nama_lengkap,nis,kelas,jenis_kelamin,status\n";

export const STUDENT_TEMPLATE_GUIDE: { column: string; rule: string }[] = [
  {
    column: "nama_lengkap",
    rule: "Wajib diisi. Contoh: Siti Aminah",
  },
  {
    column: "nis",
    rule: "Boleh kosong. Nomor induk / NISN. Contoh: 12345",
  },
  {
    column: "kelas",
    rule: "Boleh kosong. Contoh: I-A, III-B, VI-A",
  },
  {
    column: "jenis_kelamin",
    rule: "Boleh kosong. Isi L atau P (boleh juga Laki-laki / Perempuan)",
  },
  {
    column: "status",
    rule: "Boleh kosong (= Aktif). Pilihan: Aktif, Lulus, Pindahan, Keluar",
  },
];

/* --------------------------------- CSV --------------------------------- */

function detectDelimiter(headerLine: string): "," | ";" {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

/** Pecah satu baris CSV dengan dukungan tanda kutip ("). */
function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[\s._-]+/g, "")
    .replace(/[^a-z]/g, "");
}

const HEADER_MAP: Record<string, keyof StudentImportRow> = {
  nama: "full_name",
  namalengkap: "full_name",
  fullname: "full_name",
  nis: "student_number",
  nisn: "student_number",
  noinduk: "student_number",
  nomorinduk: "student_number",
  nomor: "student_number",
  kelas: "class_name",
  class: "class_name",
  rombel: "class_name",
  jk: "gender",
  jeniskelamin: "gender",
  kelamin: "gender",
  gender: "gender",
  lp: "gender",
  status: "status",
};

function normalizeGender(raw: string): {
  value: StudentGenderValue | null;
  error: string | null;
} {
  const v = raw.trim().toLowerCase();
  if (!v || v === "-" || v === "?") return { value: null, error: null };
  if (["l", "lk", "laki", "lakilaki", "male", "m"].includes(v))
    return { value: "male", error: null };
  if (["p", "pr", "perempuan", "female", "f", "w", "wanita"].includes(v))
    return { value: "female", error: null };
  return {
    value: null,
    error: `Jenis kelamin “${raw}” tidak dikenal — isi L atau P (boleh dikosongkan).`,
  };
}

function normalizeStatus(raw: string): {
  value: StudentStatusValue;
  error: string | null;
} {
  const v = raw.trim().toLowerCase();
  if (!v || v === "-" || v === "?") return { value: "active", error: null };
  if (["aktif", "active", "a"].includes(v)) return { value: "active", error: null };
  if (["lulus", "graduated", "l"].includes(v))
    return { value: "graduated", error: null };
  if (["pindahan", "pindah", "transferred", "mutasi"].includes(v))
    return { value: "transferred", error: null };
  if (["keluar", "dropped", "dropout", "do", "berhenti"].includes(v))
    return { value: "dropped", error: null };
  return {
    value: "active",
    error: `Status “${raw}” tidak dikenal — pilihan: Aktif, Lulus, Pindahan, Keluar (boleh dikosongkan = Aktif).`,
  };
}

/**
 * Ubah baris-baris string (dari CSV atau Excel) menjadi data siswa.
 * Mengembalikan baris valid + daftar masalah per baris (bahasa sederhana).
 */
export function rowsToStudents(
  header: string[],
  rows: string[][]
): { valid: StudentImportRow[]; issues: StudentImportIssue[] } {
  const colIndex = new Map<keyof StudentImportRow, number>();
  header.forEach((h, i) => {
    const mapped = HEADER_MAP[normalizeHeader(h)];
    if (mapped && !colIndex.has(mapped)) colIndex.set(mapped, i);
  });

  const valid: StudentImportRow[] = [];
  const issues: StudentImportIssue[] = [];

  if (!colIndex.has("full_name")) {
    return {
      valid: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "Kolom nama tidak ditemukan. Baris pertama harus berisi judul seperti: nama_lengkap, nis, kelas, jenis_kelamin, status. Unduh template contoh bila ragu.",
        },
      ],
    };
  }

  rows.forEach((cells, r) => {
    const rowNumber = r + 2; // +1 header, +1 basis 1
    if (cells.every((c) => !c.trim())) return; // baris kosong dilewati

    const get = (k: keyof StudentImportRow): string => {
      const idx = colIndex.get(k);
      return idx === undefined ? "" : (cells[idx] ?? "").trim();
    };

    const fullName = get("full_name").slice(0, 100);
    if (!fullName) {
      issues.push({ rowNumber, message: "Nama kosong — baris ini dilewati." });
      return;
    }

    const gender = normalizeGender(get("gender"));
    if (gender.error) {
      issues.push({ rowNumber, message: gender.error });
      return;
    }
    const status = normalizeStatus(get("status"));
    if (status.error) {
      issues.push({ rowNumber, message: status.error });
      return;
    }

    const nis = get("student_number").slice(0, 50);
    valid.push({
      full_name: fullName,
      student_number: nis || null,
      class_name: get("class_name").slice(0, 50) || null,
      gender: gender.value,
      status: status.value,
    });
  });

  return { valid, issues };
}

/** Parse teks CSV utuh → data siswa (dipakai sebelum preview & import). */
export function parseStudentsCsv(text: string): {
  valid: StudentImportRow[];
  issues: StudentImportIssue[];
} {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    return {
      valid: [],
      issues: [{ rowNumber: 0, message: "File kosong — tidak ada data." }],
    };
  }
  if (lines.length === 1) {
    return {
      valid: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "Hanya ada judul tanpa isi. Tambahkan minimal 1 baris data siswa di bawah judul.",
        },
      ],
    };
  }
  const delimiter = detectDelimiter(lines[0]);
  const header = splitCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((l) => splitCsvLine(l, delimiter));
  return rowsToStudents(header, rows);
}
