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
  no_induk: string | null;
  class_name: string | null;
  gender: StudentGenderValue | null;
  religion: string | null;
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

export type AttendanceStatus =
  | "hadir"
  | "terlambat"
  | "izin"
  | "sakit"
  | "alpa";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "hadir",
  "terlambat",
  "izin",
  "sakit",
  "alpa",
];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Alpa",
};

export const ATTENDANCE_SHORT: Record<AttendanceStatus, string> = {
  hadir: "H",
  terlambat: "T",
  izin: "I",
  sakit: "S",
  alpa: "A",
};

/** Status yang dihitung sebagai kehadiran (untuk persen rekap). */
export const PRESENT_STATUSES: AttendanceStatus[] = ["hadir", "terlambat"];

/**
 * ISO timestamptz → "HH:mm" WIB. Hitung manual (tanpa ICU) agar konsisten
 * di server maupun browser. Null/invalid → null.
 */
export function formatWibHM(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const d = new Date(t + 7 * 60 * 60 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Tanggal hari ini format YYYY-MM-DD (default pilihan tanggal absensi). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Tanggal hari ini dalam WIB (Asia/Jakarta) format YYYY-MM-DD.
 * Dipakai sebagai sumber kebenaran untuk kedaluwarsa sesi QR —
 * server (UTC) dan browser bisa beda zona waktu, sekolah patokannya WIB.
 */
export function todayWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Bulan berjalan format YYYY-MM (default filter rekap). */
export function currentMonthISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Bulan berjalan dalam WIB (Asia/Jakarta) format YYYY-MM. */
export function currentMonthWIB(now: Date = new Date()): string {
  return todayWIB(now).slice(0, 7);
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

/**
 * Tahun ajaran berjalan dalam WIB (Asia/Jakarta).
 * Dipakai halaman absensi agar server UTC (Vercel) tidak salah hari
 * pada jam 00:00–07:00 WIB. Sekolah patokannya WIB.
 */
export function currentAcademicYearWIB(now: Date = new Date()): string {
  const wib = todayWIB(now);
  const y = Number(wib.slice(0, 4));
  const m = Number(wib.slice(5, 7));
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** Tahun ajaran depan (untuk persiapan/kenaikan kelas). */
export function nextAcademicYear(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y + 1}/${y + 2}` : `${y}/${y + 1}`;
}

/** Satu tahun ajaran sebelumnya (untuk melihat arsip). */
export function previousAcademicYear(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y - 1}/${y}` : `${y - 2}/${y - 1}`;
}

/** "2026/2027" → "2027/2028". Null bila format tak dikenal. */
export function yearAfter(year: string): string | null {
  const m = year.trim().match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
}

/**
 * Daftar tahun untuk filter: tahun di database + setahun sebelumnya +
 * tahun berjalan + tahun depan (selalu bisa dipilih walau masih kosong),
 * terbaru dulu.
 */
export function academicYearOptions(existing: (string | null)[]): string[] {
  const set = new Set<string>();
  for (const y of existing) {
    if (y && y.trim()) set.add(y.trim());
  }
  set.add(previousAcademicYear());
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

/** 6 agama resmi untuk saran isian (tetap boleh tulis lain). */
export const STUDENT_RELIGIONS = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
] as const;

export const STUDENT_TEMPLATE_FILENAME = "template-data-siswa.csv";

export const STUDENT_TEMPLATE_CSV =
  "nama_lengkap,no_induk,nisn,kelas,jenis_kelamin,agama,status\n";

export const STUDENT_TEMPLATE_GUIDE: { column: string; rule: string }[] = [
  {
    column: "nama_lengkap",
    rule: "Wajib diisi. Contoh: Siti Aminah",
  },
  {
    column: "no_induk",
    rule: "Boleh kosong. Nomor induk sekolah. Contoh: 1234",
  },
  {
    column: "nisn",
    rule: "Boleh kosong. Nomor Induk Siswa Nasional. Contoh: 0101234567",
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
    column: "agama",
    rule: "Boleh kosong. Contoh: Islam, Kristen, Katolik, Hindu, Buddha, Konghucu",
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
  namasiswa: "full_name",
  fullname: "full_name",
  nis: "student_number",
  nisn: "student_number",
  nomor: "student_number",
  noinduk: "no_induk",
  nomorinduk: "no_induk",
  kelas: "class_name",
  class: "class_name",
  rombel: "class_name",
  jk: "gender",
  jeniskelamin: "gender",
  kelamin: "gender",
  gender: "gender",
  lp: "gender",
  agama: "religion",
  religion: "religion",
  status: "status",
};

/** Samakan penulisan agama resmi (tak peduli kapital/varian umum); selainnya dibiarkan apa adanya. */
function normalizeReligion(raw: string): string | null {
  const v = raw.trim().slice(0, 50);
  if (!v || v === "-" || v === "?" || v === "–") return null;
  const lower = v.toLowerCase();
  const found = (STUDENT_RELIGIONS as readonly string[]).find(
    (r) => r.toLowerCase() === lower
  );
  if (found) return found;
  const variants: Record<string, string> = {
    katholik: "Katolik",
    budha: "Buddha",
    buda: "Buddha",
    protestan: "Kristen",
    khonghucu: "Konghucu",
  };
  return variants[lower] ?? v;
}

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
function rowsToStudents(
  header: string[],
  rows: { cells: string[]; line: number }[]
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

  rows.forEach(({ cells, line }) => {
    const rowNumber = line;
    if (cells.every((c) => !c.trim())) return; // baris kosong dilewati

    const get = (k: keyof StudentImportRow): string => {
      const idx = colIndex.get(k);
      return idx === undefined ? "" : (cells[idx] ?? "").trim();
    };

    const fullName = get("full_name").slice(0, 100);
    // Baris rekap manual (mis. "L=12, P=22" atau "Jumlah : 34") dilewati
    // diam-diam — baik saat kolom nama kosong maupun saat tulisannya
    // nyasar di kolom nama. Jumlah L/P dihitung sistem, bukan dari file.
    const looksLikeSummary = (text: string): boolean =>
      [
        /l\s*=\s*\d/i,
        /p\s*=\s*\d/i,
        /jumlah/i,
        /\btotal\b/i,
        /rekap/i,
        /\bjml\b/i,
      ].some((re) => re.test(text)) || /^[^a-zA-Z]+$/.test(text);
    if (!fullName) {
      if (!looksLikeSummary(cells.join(" "))) {
        issues.push({ rowNumber, message: "Nama kosong — baris ini dilewati." });
      }
      return;
    }
    if (looksLikeSummary(fullName)) {
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
      no_induk: get("no_induk").slice(0, 50) || null,
      class_name: get("class_name").slice(0, 50) || null,
      gender: gender.value,
      religion: normalizeReligion(get("religion")),
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
  const delimiter = detectDelimiter(
    lines.find((l) => l.includes(",") || l.includes(";")) ?? lines[0]
  );
  const grid = lines.map((l) => splitCsvLine(l, delimiter));
  return gridsToStudents([{ name: null, grid }]);
}

const NAME_KEYS = new Set(["nama", "namalengkap", "namasiswa", "fullname"]);

/**
 * Ubah 1 lembar tabel (boleh ada judul/kop di atas) menjadi data siswa.
 * - Baris judul tabel dicari otomatis (bukan harus baris pertama).
 * - Kelas terdeteksi dari tulisan "Kelas : X" di atas judul.
 * - Kolom kelas yang kosong diisi dari kelas lembar tersebut.
 */
function sheetGridToStudents(
  grid: string[][],
  sheetName: string | null
): { valid: StudentImportRow[]; issues: StudentImportIssue[]; detectedClass: string | null } {
  const tag = sheetName ? `Sheet “${sheetName}” — ` : "";
  // Baris kosong dibuang, tapi nomor baris asli tetap dicatat.
  const kept: { cells: string[]; line: number }[] = [];
  grid.forEach((cells, i) => {
    if (cells.some((c) => c.trim() !== "")) kept.push({ cells, line: i + 1 });
  });
  if (kept.length === 0) {
    return { valid: [], issues: [], detectedClass: null };
  }

  let headerPos = -1;
  for (let i = 0; i < Math.min(kept.length, 12); i++) {
    if (kept[i].cells.some((c) => NAME_KEYS.has(normalizeHeader(c)))) {
      headerPos = i;
      break;
    }
  }
  if (headerPos < 0) {
    return {
      valid: [],
      issues: [
        {
          rowNumber: 1,
          message:
            `${tag}kolom nama tidak ditemukan. Pastikan ada judul kolom seperti: nama_lengkap, nis, kelas, jenis_kelamin, status. Unduh template contoh bila ragu.`,
        },
      ],
      detectedClass: null,
    };
  }

  let detectedClass: string | null = null;
  for (let i = 0; i < headerPos; i++) {
    const m = kept[i].cells
      .join(" ")
      .match(/kelas\s*:?\s*([A-Za-z0-9][A-Za-z0-9\s\-–_]*)/i);
    if (m) {
      detectedClass = m[1].trim().slice(0, 50) || null;
      break;
    }
  }

  const header = kept[headerPos].cells;
  const dataRows = kept.slice(headerPos + 1);
  if (dataRows.length === 0) {
    return {
      valid: [],
      issues: [
        {
          rowNumber: kept[headerPos].line,
          message: `${tag}hanya ada judul tanpa isi. Tambahkan minimal 1 baris data siswa di bawah judul.`,
        },
      ],
      detectedClass,
    };
  }
  const { valid, issues } = rowsToStudents(header, dataRows);
  const fixed = issues.map((issue) => ({
    ...issue,
    message: `${tag}${issue.message}`,
  }));

  if (detectedClass) {
    for (const row of valid) {
      if (!row.class_name) row.class_name = detectedClass;
    }
  }
  return { valid, issues: fixed, detectedClass };
}

/**
 * Gabungkan banyak lembar (Excel multi-sheet / satu CSV).
 * Lembar kosong dilewati diam-diam.
 */
export function gridsToStudents(
  sheets: { name: string | null; grid: string[][] }[]
): { valid: StudentImportRow[]; issues: StudentImportIssue[] } {
  const valid: StudentImportRow[] = [];
  const issues: StudentImportIssue[] = [];
  for (const sheet of sheets) {
    const parsed = sheetGridToStudents(sheet.grid, sheet.name);
    valid.push(...parsed.valid);
    issues.push(...parsed.issues);
  }
  if (valid.length === 0 && issues.length === 0) {
    return {
      valid: [],
      issues: [{ rowNumber: 0, message: "File kosong — tidak ada data." }],
    };
  }
  return { valid, issues };
}
