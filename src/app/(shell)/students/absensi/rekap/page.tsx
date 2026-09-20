import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ShieldAlert,
  TriangleAlert,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMonthlyRecap } from "@/services/student-attendance.service";
import {
  getMyAssignments,
  getTeacherClassAccess,
} from "@/services/teaching-assignment.service";
import { getMyTeacher } from "@/services/teacher.service";
import {
  allowedClassesFor,
  currentMonthISO,
  monthLabelID,
  schoolYearForMonth,
} from "@/lib/students";
import { getActiveSchoolClassNames } from "@/services/school-class.service";
import { Badge, Empty, PageHeader, Panel } from "@/components/common";
import { ExportRecapExcelButton } from "@/components/students/attendance-export";
import MyClasses from "@/components/students/my-classes";
import RecapFilterBar from "@/components/students/recap-filter-bar";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function recapHref(month: string, kelas: string): string {
  const params = new URLSearchParams();
  params.set("bulan", month);
  params.set("kelas", kelas);
  return `/students/absensi/rekap?${params.toString()}`;
}

export default async function AttendanceRecapPage({
  searchParams,
}: {
  searchParams?: Promise<{ bulan?: string; kelas?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const month = MONTH_RE.test(query.bulan?.trim() ?? "")
    ? (query.bulan as string).trim()
    : currentMonthISO();
  const requestedClass = query.kelas?.trim() || null;

  const user = await getCurrentUser();
  const isTeacher = user?.role === "teacher";

  const [myTeacher, myAssignments, access] = isTeacher
    ? await Promise.all([
        getMyTeacher().catch(() => null),
        getMyAssignments().catch(() => []),
        // Gagal memuat = tidak ada akses (fail-closed, bukan fail-open).
        getTeacherClassAccess().catch(() => ({
          homeroom: null,
          assignedByYear: {},
        })),
      ])
    : [null, [], null];

  const homeroom = (myTeacher?.homeroom_class ?? "").trim() || null;
  // Guru hanya boleh melihat kelasnya sendiri (wali + yang diajar).
  const allowed = allowedClassesFor(
    access,
    schoolYearForMonth(month)
  );

  // Tampilan awal otomatis: kelas yang diwali → kelas pertama yang diajar →
  // ringkasan semua kelas (Kepala Sekolah).
  const autoClass =
    homeroom ??
    myAssignments.map((a) => a.class_name).find((c) => c.trim() !== "") ??
    null;
  const view: { mode: "all" } | { mode: "class"; name: string } =
    requestedClass === "__semua__"
      ? { mode: "all" }
      : requestedClass
        ? { mode: "class", name: requestedClass }
        : autoClass
          ? { mode: "class", name: autoClass }
          : { mode: "all" };

  // Kelas di luar hak akses guru ditolak dengan pesan yang jelas.
  if (view.mode === "class" && allowed && !allowed.includes(view.name)) {
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
          description={`Kelas ${view.name} bukan kelas yang Anda wali atau ajar, jadi rekapnya tidak bisa dibuka. Silakan pilih kelas Anda.`}
          actionHref="/students"
          actionLabel="Pilih kelas saya"
        />
      </div>
    );
  }

  const recap = await getMonthlyRecap({
    month,
    className: view.mode === "class" ? view.name : null,
    onlyClasses: allowed,
  });

  const quick: { name: string; label: string }[] = [];
  if (homeroom) quick.push({ name: homeroom, label: `Wali: Kelas ${homeroom}` });
  for (const a of myAssignments) {
    if (!quick.some((q) => q.name === a.class_name)) {
      quick.push({ name: a.class_name, label: `${a.class_name} • ${a.subject}` });
    }
  }

  const defaultNote =
    !requestedClass && view.mode === "class"
      ? homeroom
        ? `Menampilkan kelas ${homeroom} yang Anda wali.`
        : "Menampilkan salah satu kelas yang Anda ajar."
      : null;

  const monthLabel = monthLabelID(month);
  const single = view.mode === "class" ? (recap.classes[0] ?? null) : null;

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
        eyebrow="Kesiswaan • Rekap Absensi"
        title={`Rekap ${monthLabel}`}
        description="Ringkasan kehadiran per bulan: berapa yang hadir, siapa yang izin, sakit, atau alpa."
        actions={
          single ? (
            <ExportRecapExcelButton
              className={single.className}
              month={month}
              monthLabel={monthLabel}
              rows={single.rows.map((r) => ({
                nama: r.full_name,
                nis: r.student_number,
                hadir: r.hadir,
                terlambat: r.terlambat,
                izin: r.izin,
                sakit: r.sakit,
                alpa: r.alpa,
                percent: r.percent,
              }))}
            />
          ) : undefined
        }
      />

      <RecapFilterBar
        month={month}
        classValue={view.mode === "all" ? "__semua__" : view.name}
        allClasses={recap.allClasses}
        quick={quick}
        allLabel={isTeacher ? "Semua kelas saya (ringkasan)" : undefined}
      />
      {defaultNote && (
        <p className="-mt-3 text-sm text-muted-foreground">{defaultNote}</p>
      )}

      {/* Ringkasan angka */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-5 py-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="flex items-baseline gap-2">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden />
            Hari tercatat
          </span>
          <span className="tnum text-lg font-bold">
            {view.mode === "class" ? (single?.days ?? 0) : recap.totals.days}
          </span>
        </div>
        {[
          { label: "Kehadiran", value: `${view.mode === "class" ? (single?.percent ?? 100) : recap.totals.percent}%` },
          { label: "Hadir", value: view.mode === "class" ? (single?.hadir ?? 0) : recap.totals.hadir },
          { label: "Terlambat", value: view.mode === "class" ? (single?.terlambat ?? 0) : recap.totals.terlambat },
          { label: "Izin", value: view.mode === "class" ? (single?.izin ?? 0) : recap.totals.izin },
          { label: "Sakit", value: view.mode === "class" ? (single?.sakit ?? 0) : recap.totals.sakit },
          { label: "Alpa", value: view.mode === "class" ? (single?.alpa ?? 0) : recap.totals.alpa },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <span className="text-muted-foreground">{s.label}</span>
            <span className="tnum text-lg font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {view.mode === "class" ? (
        single ? (
          <>
            {single.attention.length > 0 && (
              <div className="rounded-xl border border-amber-600/25 bg-amber-50 p-4">
                <p className="flex items-center gap-1.5 text-[15px] font-bold text-amber-900">
                  <TriangleAlert className="h-4 w-4" aria-hidden />
                  Perlu perhatian ({single.attention.length} anak)
                </p>
                <ul className="mt-2 space-y-1 text-[15px] text-amber-900">
                  {single.attention.map((a) => (
                    <li key={a.name}>
                      <strong>{a.name}</strong> — {a.reason}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-800">
                  Aturan: Alpa 3 kali atau lebih, atau kehadiran di bawah 85%.
                </p>
              </div>
            )}

            <Panel title={`Kelas ${single.className} — ${single.rows.length} siswa`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="px-3 py-2.5 font-semibold">Nama</th>
                      <th className="px-3 py-2.5 text-center font-semibold">H</th>
                      <th className="px-3 py-2.5 text-center font-semibold">T</th>
                      <th className="px-3 py-2.5 text-center font-semibold">I</th>
                      <th className="px-3 py-2.5 text-center font-semibold">S</th>
                      <th className="px-3 py-2.5 text-center font-semibold">A</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {single.rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-3 py-2.5 font-semibold">
                          {r.full_name}
                          {r.student_number && (
                            <span className="tnum ml-2 text-sm font-normal text-muted-foreground">
                              {r.student_number}
                            </span>
                          )}
                        </td>
                        <td className="tnum px-3 py-2.5 text-center">{r.hadir}</td>
                        <td className="tnum px-3 py-2.5 text-center">{r.terlambat}</td>
                        <td className="tnum px-3 py-2.5 text-center">{r.izin}</td>
                        <td className="tnum px-3 py-2.5 text-center">{r.sakit}</td>
                        <td className="tnum px-3 py-2.5 text-center">{r.alpa}</td>
                        <td className="px-3 py-2.5 text-right">
                          <Badge tone={r.percent < 85 && r.total > 0 ? "warning" : "success"}>
                            {r.percent}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : (
          <Empty
            icon={Users}
            title={`Belum ada absensi Kelas ${view.name} bulan ${monthLabel}`}
            description="Isi absensi harian dulu, rekapnya akan muncul di sini."
            actionHref={`/students/absensi?tahun=${encodeURIComponent(recap.schoolYear)}&kelas=${encodeURIComponent(view.name)}`}
            actionLabel="Isi absensi"
          />
        )
      ) : recap.totals.total === 0 ? (
        <Empty
          icon={Users}
          title={`Belum ada absensi bulan ${monthLabel}`}
          description="Isi absensi harian dulu, rekapnya akan muncul di sini."
          actionHref="/students"
          actionLabel="Ke Data Siswa"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recap.classes.map((c) => (
            <Link
              key={c.className}
              href={recapHref(month, c.className)}
              className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold">Kelas {c.className}</span>
                <Badge tone={c.percent < 85 ? "warning" : "success"}>
                  {c.percent}%
                </Badge>
              </span>
              <span className="tnum mt-1 block text-sm text-muted-foreground">
                {c.days} hari • H {c.hadir} • T {c.terlambat} • I {c.izin} • S {c.sakit} • A {c.alpa}
              </span>
              {c.attention.length > 0 && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  <TriangleAlert className="h-3 w-3" aria-hidden />
                  {c.attention.length} perlu perhatian
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {isTeacher && (
        <Panel
          title="Kelas yang saya ajar"
          description="Daftar ini dipakai sebagai jalan pintas di halaman ini. Mapel mengikuti yang diisi di sini."
        >
          <MyClasses
            academicYear={recap.schoolYear}
            defaultSubject={myTeacher?.subject ?? ""}
            initial={myAssignments
              .filter((a) => a.academic_year === recap.schoolYear)
              .map((a) => ({ id: a.id, class_name: a.class_name, subject: a.subject }))}
            classOptions={await getActiveSchoolClassNames().catch(() => [] as string[])}
          />
        </Panel>
      )}
    </div>
  );
}
