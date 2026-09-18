import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  SearchX,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getStudents } from "@/services/student.service";
import { getTeachers } from "@/services/teacher.service";
import { getTeacherClassAccess } from "@/services/teaching-assignment.service";
import {
  getActiveSchoolClassNames,
  getSchoolClassesWithUsage,
} from "@/services/school-class.service";
import { allowedClassesFor, currentAcademicYear } from "@/lib/students";
import { Empty, PageHeader, Panel } from "@/components/common";
import { cn } from "@/lib/utils";
import ClassHomeroom from "@/components/students/class-homeroom";
import ClassManager from "@/components/students/class-manager";
import StudentFilterBar from "@/components/students/student-filter-bar";
import StudentImportPanel from "@/components/students/student-import-panel";
import StudentPromotePanel from "@/components/students/student-promote-panel";
import { StudentAddButton } from "@/components/students/student-table";
import StudentTable from "@/components/students/student-table";

export const dynamic = "force-dynamic";

function cardsHref(tahun: string, kelas: string, cari: string): string {
  const params = new URLSearchParams();
  params.set("tahun", tahun);
  if (kelas) params.set("kelas", kelas);
  if (cari) params.set("cari", cari);
  return `/students?${params.toString()}`;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tahun?: string; kelas?: string; cari?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const fallbackYear = currentAcademicYear();
  // Guru hanya boleh melihat kelasnya sendiri (wali + yang diajar).
  // Null = akses penuh (Kepala Sekolah/Admin).
  const access = await getTeacherClassAccess();

  async function load(year: string, className: string | null) {
    return getStudents({
      academicYear: year,
      className,
      search: query.cari?.trim() || null,
      allowedClasses: allowedClassesFor(access, year),
    });
  }

  let data = await load(
    query.tahun?.trim() || fallbackYear,
    query.kelas?.trim() || null
  );

  // Tahun ajaran dari URL ketikan manual yang tidak dikenal → pakai tahun berjalan.
  if (query.tahun && !data.years.includes(query.tahun.trim())) {
    data = await load(fallbackYear, query.kelas?.trim() || null);
  }

  const activeYear = data.years.includes(query.tahun?.trim() ?? "")
    ? (query.tahun as string).trim()
    : fallbackYear;
  const allowedNow = allowedClassesFor(access, activeYear);
  const requestedClass = query.kelas?.trim() || "";
  // Kelas di luar hak akses guru diabaikan (tidak bocor lewat URL).
  const blockedClass =
    !!allowedNow && !!requestedClass && !allowedNow.includes(requestedClass);
  const activeClass = blockedClass ? "" : requestedClass;
  if (blockedClass) {
    data = await load(activeYear, null);
  }
  const activeSearch = query.cari?.trim() || "";
  // Guru tanpa kelas terkait tahun ini (belum jadi wali & belum isi daftar ajar).
  const noAccess = !!allowedNow && allowedNow.length === 0;

  const [user, teachers] = await Promise.all([getCurrentUser(), getTeachers()]);
  const canAssignHomeroom =
    user !== null && hasRole(user.role, "principal");
  const isPrincipal = canAssignHomeroom;
  // Daftar kelas master: lengkap + pemakaian untuk kepsek, nama aktif saja untuk guru.
  const [classMaster, masterNames] = await Promise.all([
    isPrincipal ? getSchoolClassesWithUsage().catch(() => []) : Promise.resolve([]),
    getActiveSchoolClassNames().catch(() => [] as string[]),
  ]);
  // Saran kelas = gabungan master + yang sudah dipakai di data (abu-abu masa lalu tetap bisa dipilih).
  const classSuggestions = Array.from(
    new Set([...masterNames, ...data.classes])
  ).sort((a, b) => a.localeCompare(b, "id"));
  const activeTeachers = teachers.filter((t) => t.employment_status === "active");
  const homeroomByClass = new Map<string, string>();
  for (const t of activeTeachers) {
    const held = (t.homeroom_class ?? "").trim();
    if (held && !homeroomByClass.has(held)) {
      homeroomByClass.set(held, t.profile?.full_name ?? "Tanpa nama");
    }
  }
  const teacherOptions = activeTeachers.map((t) => ({
    id: t.id,
    name: t.profile?.full_name ?? "Tanpa nama",
    subject: t.subject,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kesiswaan"
        title="Data Siswa"
        description="Pilih tahun ajaran, ketuk kartu kelas untuk melihat daftar siswanya. Bisa tambah satu per satu, import dari Excel/CSV, atau naikkan kelas sekaligus."
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <Link
              href="/students/absensi/rekap"
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
            >
              <ClipboardCheck className="h-5 w-5" aria-hidden />
              Rekap absensi
            </Link>
          <StudentAddButton
            defaultYear={activeYear}
            yearOptions={data.years}
            classOptions={classSuggestions}
            presetClass={activeClass || undefined}
            label={activeClass ? `Tambah ke kelas ${activeClass}` : "Tambah siswa"}
          />
          </span>
        }
      />

      <StudentFilterBar
        years={data.years}
        classes={data.classes}
        initial={{ tahun: activeYear, kelas: activeClass, cari: activeSearch }}
      />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {[
          { label: "Total siswa", value: data.stats.total },
          { label: "Laki-laki", value: data.stats.male },
          { label: "Perempuan", value: data.stats.female },
          { label: "Jumlah kelas", value: data.stats.classCount },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="tnum text-lg font-bold">{s.value}</span>
          </div>
        ))}
        <span className="text-xs text-muted-foreground">
          Tahun ajaran {activeYear}
        </span>
      </div>

      {isPrincipal && (
        <Panel
          title="Daftar Kelas"
          description="Atur sekali di sini. Daftar ini menjadi pilihan kelas saat guru mendaftar, mengisi kelas yang diajar, dan mengatur wali kelas."
        >
          <ClassManager initial={classMaster} />
        </Panel>
      )}

      {/* Kartu kelas — ketuk untuk melihat daftar siswa kelas tersebut */}
      <section aria-label="Pilih kelas">
        <h3 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold">
          <LayoutGrid className="h-4 w-4 text-brand" aria-hidden />
          Pilih kelas
        </h3>
        {data.classCounts.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-[15px] text-muted-foreground">
            Belum ada kelas pada tahun {activeYear}. Tambahkan siswa baru atau
            import dari Excel/CSV di bawah.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Link
              href={cardsHref(activeYear, "", activeSearch)}
              aria-current={activeClass === "" ? "page" : undefined}
              className={cn(
                "flex min-h-[88px] flex-col justify-between rounded-xl border-2 bg-card p-4 transition-colors hover:border-primary/50",
                activeClass === ""
                  ? "border-primary shadow-sm"
                  : "border-border"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold">Semua kelas</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
              </span>
              <span className="tnum text-sm text-muted-foreground">
                {data.stats.total} siswa
              </span>
            </Link>
            {data.classCounts.map((c) => {
              const selected = activeClass === (c.name ?? "");
              const classLabel = c.name ? `Kelas ${c.name}` : "Tanpa kelas";
              return (
                <div
                  key={c.name ?? "__none__"}
                  className={cn(
                    "flex min-h-[88px] flex-col justify-between gap-2 rounded-xl border-2 bg-card p-4 transition-colors",
                    selected ? "border-primary shadow-sm" : "border-border"
                  )}
                >
                  <Link
                    href={cardsHref(activeYear, c.name ?? "", activeSearch)}
                    aria-current={selected ? "page" : undefined}
                    aria-label={`Lihat daftar ${classLabel}, ${c.total} siswa`}
                    className="flex items-start justify-between gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    <span>
                      <span className="block text-[15px] font-bold">
                        {classLabel}
                      </span>
                      <span className="tnum mt-0.5 block text-sm text-muted-foreground">
                        {c.total} siswa • {c.male} L • {c.female} P
                      </span>
                    </span>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2">
                    {c.name ? (
                      <>
                        <ClassHomeroom
                          className={c.name}
                          waliName={homeroomByClass.get(c.name) ?? null}
                          canAssign={canAssignHomeroom}
                          teachers={teacherOptions}
                        />
                        <Link
                          href={`/students/absensi?tahun=${encodeURIComponent(activeYear)}&kelas=${encodeURIComponent(c.name)}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand/10"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                          Absensi
                        </Link>
                      </>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">
                        Isi kelasnya dulu lewat Ubah data siswa.
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Daftar siswa */}
      {noAccess ? (
        <Empty
          icon={Users}
          title="Belum ada kelas untuk Anda"
          description="Akun guru hanya menampilkan kelas yang diwali dan kelas yang diajar. Minta Kepala Sekolah menetapkan Anda sebagai wali kelas, atau isi daftar kelas yang Anda ajar di halaman Rekap Absensi."
          actionHref="/students/absensi/rekap"
          actionLabel="Isi kelas yang saya ajar"
        />
      ) : data.stats.total === 0 ? (
        <Empty
          icon={Users}
          title={`Belum ada data siswa tahun ${activeYear}`}
          description="Tambahkan dengan tombol di atas, import dari Excel/CSV, atau proses kenaikan kelas dari tahun sebelumnya di bawah."
        />
      ) : data.rows.length === 0 ? (
        <Empty
          icon={SearchX}
          title="Tidak ketemu"
          description="Coba ubah kata pencarian atau pilih kelas lain."
          actionHref={`/students?tahun=${encodeURIComponent(activeYear)}`}
          actionLabel="Tampilkan semua"
        />
      ) : (
        <Panel
          title={
            activeClass
              ? `Kelas ${activeClass} — ${data.rows.length} siswa`
              : `Semua siswa — ${data.rows.length} ditampilkan`
          }
          description={
            activeClass
              ? `Tahun ajaran ${activeYear}.`
              : `Tahun ajaran ${activeYear}. Ketuk kartu kelas di atas untuk fokus ke satu kelas.`
          }
          action={
            activeClass ? (
              <span className="flex flex-wrap items-center gap-2">
                <Link
                  href={cardsHref(activeYear, "", activeSearch)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Semua kelas
                </Link>
                <Link
                  href={`/students/absensi?tahun=${encodeURIComponent(activeYear)}&kelas=${encodeURIComponent(activeClass)}`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden />
                  Absensi kelas ini
                </Link>
              </span>
            ) : undefined
          }
        >
          <StudentTable
            rows={data.rows}
            defaultYear={activeYear}
            yearOptions={data.years}
            classOptions={classSuggestions}
          />
        </Panel>
      )}

      {!noAccess && (
        <Panel
          title="Kenaikan Kelas"
          description="Pindahkan banyak siswa sekaligus ke tahun ajaran berikutnya. Kelas tujuan terisi otomatis dan bisa diubah."
        >
        <StudentPromotePanel
          yearOptions={data.years}
          initialSourceYear={activeYear}
          classOptions={masterNames}
        />
        </Panel>
      )}

      {!noAccess && (
        <Panel
          title="Import dari Excel / CSV"
          description="Punya daftar siswa di Excel? Ikuti 4 langkah mudah di bawah ini."
        >
          <StudentImportPanel defaultYear={activeYear} yearOptions={data.years} />
        </Panel>
      )}
    </div>
  );
}
