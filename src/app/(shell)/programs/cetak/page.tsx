import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePrincipal } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";
import { getMySchool } from "@/services/school.service";
import { getProgramYears, listPrograms } from "@/services/program.service";
import { formatActivityDate, semesterLabel } from "@/lib/programs";
import { currentAcademicYear } from "@/lib/students";
import PrintDocumentButton from "@/components/programs/print-document-button";

export const dynamic = "force-dynamic";

function longDateID(now: Date = new Date()): string {
  return now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Dokumen Program Kegiatan Semester — siap cetak (A4).
 * Chrome aplikasi (sidebar/header/tombol) disembunyikan saat mencetak
 * lewat print:hidden di AppShell.
 */
export default async function CetakProgramPage({
  searchParams,
}: {
  searchParams?: Promise<{ semester?: string; tahun?: string }>;
}) {
  await requirePrincipal();
  const user = await getCurrentUser();

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

  const [school, programs] = await Promise.all([
    getMySchool().catch(() => null),
    listPrograms({ semester, academicYear }).catch(() => []),
  ]);

  const city = school?.city?.trim() || "........";
  const principalName =
    school?.principal_name?.trim() || user?.fullName || "........";
  const principalNip = school?.principal_nip?.trim() || "-";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href={`/programs?semester=${semester}&tahun=${encodeURIComponent(academicYear)}`}
          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali
        </Link>
        <PrintDocumentButton />
      </div>

      {/* Lembar dokumen */}
      <article className="mx-auto max-w-4xl rounded-xl border bg-white p-6 text-slate-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-10">
        {/* Kop sekolah */}
        <header>
          <div className="flex items-center justify-center gap-4">
            {school?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logo_url}
                alt="Logo sekolah"
                className="h-20 w-20 shrink-0 object-contain"
              />
            )}
            <div className="text-center">
              <p className="text-lg font-bold uppercase leading-tight">
                {school?.name ?? "Nama Sekolah"}
              </p>
              {school?.address && <p className="mt-1 text-sm">{school.address}</p>}
              <p className="text-sm">
                {[school?.phone && `Telp. ${school.phone}`, school?.npsn && `NPSN : ${school.npsn}`]
                  .filter(Boolean)
                  .join(" • ") || " "}
              </p>
            </div>
          </div>
          <div className="mt-3 border-b-4 border-double border-slate-900" aria-hidden />
        </header>

        <h1 className="mt-5 text-center text-lg font-bold uppercase leading-snug">
          Program Kegiatan {semesterLabel(semester)}
          <br />
          Tahun Pelajaran {academicYear.replace("/", " – ")}
        </h1>
        <p className="mt-3 text-[13px] italic text-slate-700">
          KET : Kalender kegiatan ini mohon disimpan dan ada pengumuman kembali
          apabila jadwal mengalami perubahan.
        </p>

        {/* Tabel kegiatan */}
        <table className="mt-4 w-full border-collapse text-[14px]">
          <thead>
            <tr className="border border-slate-900">
              <th className="w-10 border border-slate-900 px-2 py-1.5 text-center font-bold">No</th>
              <th className="w-56 border border-slate-900 px-2 py-1.5 text-left font-bold">Tanggal</th>
              <th className="border border-slate-900 px-2 py-1.5 text-left font-bold">Jenis Kegiatan</th>
            </tr>
          </thead>
          <tbody>
            {programs.length === 0 ? (
              <tr>
                <td colSpan={3} className="border border-slate-900 px-2 py-6 text-center text-slate-500">
                  Belum ada kegiatan pada semester ini.
                </td>
              </tr>
            ) : (
              programs.map((p, i) => (
                <tr key={p.id}>
                  <td className="border border-slate-900 px-2 py-1.5 text-center">{i + 1}</td>
                  <td className="whitespace-nowrap border border-slate-900 px-2 py-1.5 font-medium">
                    {formatActivityDate(p.start_date, p.end_date)}
                  </td>
                  <td className="border border-slate-900 px-2 py-1.5">
                    {p.name}
                    {p.description && (
                      <span className="text-slate-600"> — {p.description}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Tanda tangan + stempel */}
        <div className="mt-8 flex justify-end">
          <div className="w-64 text-center text-[14px]">
            <p>
              {city}, {longDateID()}
            </p>
            <p>Kepala Sekolah,</p>
            <div className="relative mx-auto h-24 w-56" aria-hidden>
              {school?.stamp_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.stamp_url}
                  alt=""
                  className="absolute bottom-0 left-0 h-24 w-24 -rotate-6 object-contain opacity-90"
                />
              )}
              {school?.signature_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.signature_url}
                  alt=""
                  className="absolute bottom-1 left-1/2 h-20 w-44 -translate-x-1/2 object-contain"
                />
              )}
            </div>
            <p className="font-bold underline underline-offset-4">{principalName}</p>
            <p>NIP. {principalNip}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
