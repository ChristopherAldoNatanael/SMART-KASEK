import Link from "next/link";
import { ArrowLeft, ClipboardCheck, ShieldAlert, Users } from "lucide-react";
import { getAttendanceSheet } from "@/services/student-attendance.service";
import { getTeacherClassAccess } from "@/services/teaching-assignment.service";
import { allowedClassesFor, currentAcademicYear, todayISO } from "@/lib/students";
import { Empty, PageHeader, Panel } from "@/components/common";
import AttendanceDateNav from "@/components/students/attendance-date-nav";
import AttendanceForm from "@/components/students/attendance-form";
import AttendanceSessionPanel from "@/components/students/attendance-session-panel";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{ tahun?: string; kelas?: string; tanggal?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const academicYear = query.tahun?.trim() || currentAcademicYear();
  const className = query.kelas?.trim() || "";
  const rawDate = query.tanggal?.trim() || todayISO();
  const date = DATE_RE.test(rawDate) && rawDate <= todayISO() ? rawDate : todayISO();

  if (!className) {
    return (
      <div className="space-y-6">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Data Siswa
        </Link>
        <PageHeader
          eyebrow="Kesiswaan • Absensi"
          title="Absensi Kelas"
          description="Pilih dulu kelasnya dari Data Siswa."
        />
        <Empty
          icon={Users}
          title="Belum ada kelas yang dipilih"
          description="Kembali ke Data Siswa, ketuk kartu kelas, lalu tekan Absensi."
          actionHref="/students"
          actionLabel="Ke Data Siswa"
        />
      </div>
    );
  }

  // Guru hanya boleh mengisi kelasnya sendiri (wali + yang diajar).
  const access = await getTeacherClassAccess();
  const allowed = allowedClassesFor(access, academicYear);
  if (allowed && !allowed.includes(className)) {
    return (
      <div className="space-y-6">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Data Siswa
        </Link>
        <Empty
          icon={ShieldAlert}
          title="Bukan kelas Anda"
          description={`Kelas ${className} bukan kelas yang Anda wali atau ajar, jadi absensinya tidak bisa dibuka. Silakan pilih kelas Anda di Data Siswa.`}
          actionHref="/students"
          actionLabel="Pilih kelas saya"
        />
      </div>
    );
  }

  const sheet = await getAttendanceSheet({
    academicYear,
    className,
    date,
    allowedClasses: allowed,
  });

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Link
        href={`/students?tahun=${encodeURIComponent(academicYear)}&kelas=${encodeURIComponent(className)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Kembali ke kelas {className}
      </Link>

      <PageHeader
        eyebrow={`Kesiswaan • Absensi • ${dateLabel}`}
        title={`Kelas ${className}`}
        description={`Tahun ajaran ${academicYear}. Ketuk H / T / I / S / A untuk tiap anak, lalu tekan Simpan absensi. Yang belum diketuk = Belum Absen (bukan Hadir). Menyimpan ulang tanggal yang sama berarti mengoreksi.`}
        actions={
          <Link
            href={`/students/absensi/rekap?bulan=${date.slice(0, 7)}&kelas=${encodeURIComponent(className)}`}
            className="inline-flex min-h-[48px] items-center rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
          >
            Rekap bulan ini
          </Link>
        }
      />

      <AttendanceDateNav
        academicYear={academicYear}
        className={className}
        current={date}
      />

      <AttendanceSessionPanel
        academicYear={academicYear}
        className={className}
        date={date}
      />

      {sheet.rows.length === 0 ? (
        <Empty
          icon={ClipboardCheck}
          title="Tidak ada siswa di kelas ini"
          description={`Kelas ${className} tahun ${academicYear} belum berisi siswa.`}
          actionHref={`/students?tahun=${encodeURIComponent(academicYear)}&kelas=${encodeURIComponent(className)}`}
          actionLabel="Kelola kelas ini"
        />
      ) : (
        <Panel
          title={`Daftar hadir — ${sheet.rows.length} siswa`}
          description={
            sheet.filled > 0
              ? `Sudah terisi ${sheet.filled} dari ${sheet.rows.length}.`
              : "Belum ada yang diisi hari ini — tandai satu per satu, atau pakai Semua hadir lalu koreksi."
          }
        >
          <AttendanceForm
            academicYear={academicYear}
            className={className}
            date={date}
            initialRows={sheet.rows}
          />
        </Panel>
      )}
    </div>
  );
}
