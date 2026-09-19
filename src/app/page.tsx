"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BrainCircuit,
  CalendarCheck,
  Check,
  ClipboardList,
  MessagesSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const fakta = [
  { angka: "13", label: "Komponen administrasi kelas" },
  { angka: "10", label: "Indikator perencanaan pembelajaran" },
  { angka: "11", label: "Komponen penyusunan ATP/Silabus" },
  { angka: "34", label: "Total indikator manajerial" },
];

const modul = [
  {
    no: "01",
    title: "Supervisi Akademik & Manajerial",
    desc: "Instrumen sesuai dokumen supervisi sekolah. Skor 1–4 atau Ada/Tidak, nilai dihitung otomatis, hasil terkunci saat final.",
  },
  {
    no: "02",
    title: "AI Coach Guru",
    desc: "Rekomendasi pembinaan yang disusun dari hasil supervisi, coaching sebelumnya, dan riwayat tiap guru — bukan penilaian sepihak.",
  },
  {
    no: "03",
    title: "Coaching & Tindak Lanjut",
    desc: "Setiap temuan supervisi disambung ke sesi coaching dengan target, penanggung jawab, dan status yang terpantau.",
  },
  {
    no: "04",
    title: "Data Siswa & Absensi",
    desc: "Siswa dikelola per kelas dan tahun ajaran. Import Excel sekaligus, absensi harian H/I/S/A, rekap bulanan otomatis.",
  },
  {
    no: "05",
    title: "Kenaikan Kelas",
    desc: "Wali kelas memberi rekomendasi, Kepala Sekolah memverifikasi dan menetapkan. Riwayat per tahun tersimpan rapi.",
  },
  {
    no: "06",
    title: "Teacher Growth & Insight",
    desc: "Perkembangan tiap guru terekam sebagai riwayat, lengkap dengan penanda dini guru yang perlu perhatian.",
  },
];

const langkahAlur = [
  { title: "Supervisi", desc: "Kepala Sekolah menilai dengan instrumen baku." },
  { title: "Rekomendasi AI", desc: "Temuan diubah menjadi saran pembinaan." },
  { title: "Coaching", desc: "Guru didampingi sesuai rencana tindak lanjut." },
  { title: "Tindak Lanjut", desc: "Perbaikan dipantau sampai tuntas." },
  { title: "Bertumbuh", desc: "Perkembangan tercatat dari waktu ke waktu." },
];

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  const masukHref = isLoggedIn ? "/dashboard" : "/login";

  return (
    <main className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ============ HEADER ============ */}
      <header className="sticky inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="SMART KASEK">
            <Image
              src="/logo.png"
              alt="Logo SMART KASEK"
              width={34}
              height={34}
              className="h-[34px] w-[34px] rounded-lg object-cover ring-1 ring-slate-200"
            />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">
                SMART KASEK
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Platform Sekolah
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Navigasi utama">
            <a href="#modul" className="transition-colors hover:text-slate-900">Modul</a>
            <a href="#alur" className="transition-colors hover:text-slate-900">Alur Kerja</a>
            <a href="#peran" className="transition-colors hover:text-slate-900">Peran</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={masukHref}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900"
            >
              {isLoggedIn ? "Dashboard" : "Masuk"}
            </Link>
            {!isLoggedIn && (
              <Link
                href="/register"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                Daftar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section
        className="border-b border-slate-200/70 px-5 pb-16 pt-14 md:pt-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.07) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-700/25 bg-emerald-50 px-4 py-1.5 text-[13px] font-bold text-emerald-800">
              <Sparkles className="h-4 w-4" aria-hidden />
              School Management, Administration, Reflection & Teacher Growth
            </p>
            <h1 className="mt-5 font-serif text-[42px] font-bold leading-[1.08] tracking-tight text-slate-900 md:text-6xl">
              Supervisi yang tertib, guru yang bertumbuh.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              SMART KASEK merapikan seluruh pekerjaan pembinaan guru — dari
              pengisian 34 indikator supervisi, coaching dan tindak lanjut,
              absensi siswa, sampai penetapan kenaikan kelas — dalam satu
              tempat yang datanya saling terhubung.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={masukHref}
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-8 text-[15px] font-bold text-white transition-all hover:bg-emerald-800 active:scale-[0.98]"
              >
                {isLoggedIn ? "Masuk ke Dashboard" : "Mulai Menggunakan"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <a
                href="#modul"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-slate-300 bg-white px-8 text-[15px] font-bold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                Lihat Modulnya
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-slate-200 pt-6">
              {[
                { angka: "34", label: "Indikator supervisi" },
                { angka: "6", label: "Modul terhubung" },
                { angka: "3", label: "Peran pengguna" },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="order-2 mt-1 text-[13px] leading-snug text-slate-500">
                    {s.label}
                  </dt>
                  <dd className="order-1 font-serif text-4xl font-bold text-slate-900">
                    {s.angka}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Pratinjau tampilan aplikasi */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]">
              <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="ml-3 hidden flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-400 ring-1 ring-slate-200 sm:block">
                  Hasil Supervisi Manajerial
                </span>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">Nilai Supervisi Manajerial</p>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    Final
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Instrumen 1", value: "86,50" },
                    { label: "Instrumen 2", value: "90,00" },
                    { label: "Instrumen 3", value: "82,14" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-200 p-3">
                      <p className="tnum text-xl font-extrabold">{s.value}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-emerald-700/20 bg-emerald-50/60 p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-bold">Nilai Akhir 86,21</p>
                    <p className="font-bold text-emerald-800">Baik</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-900/10">
                    <div className="h-full w-[86%] rounded-full bg-emerald-700" />
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                  <BrainCircuit className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  <p className="text-xs leading-relaxed text-slate-600">
                    <strong>Rekomendasi AI:</strong> lengkapi papan data kelas,
                    lalu jadwalkan coaching asesmen formatif.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Contoh tampilan hasil supervisi di dalam aplikasi
            </p>
          </div>
        </div>
      </section>

      {/* ============ PITA FAKTA ============ */}
      <section className="bg-emerald-950 px-5 py-10 text-white" aria-label="Fakta instrumen">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 lg:grid-cols-4">
          {fakta.map((f) => (
            <div key={f.label} className="border-l-2 border-emerald-700 pl-4">
              <dd className="font-serif text-4xl font-bold md:text-5xl">{f.angka}</dd>
              <dt className="mt-1 text-sm text-emerald-100/80">{f.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ============ MODUL ============ */}
      <section id="modul" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Modul
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl font-serif text-3xl font-bold tracking-tight md:text-4xl">
            Enam modul yang datanya saling terhubung
          </h2>
          <Link
            href={masukHref}
            className="group inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 hover:text-emerald-900"
          >
            Buka aplikasi
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </Link>
        </div>
        <ol className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {modul.map((m) => (
            <li key={m.no}>
              <Link
                href={masukHref}
                className="group grid gap-1 py-6 transition-colors sm:grid-cols-[64px_240px_1fr_32px] sm:items-baseline sm:gap-6 hover:bg-slate-50/60"
              >
                <span className="font-serif text-lg font-bold text-slate-300 transition-colors group-hover:text-emerald-700">
                  {m.no}
                </span>
                <span className="text-lg font-bold tracking-tight">{m.title}</span>
                <span className="max-w-2xl text-[15px] leading-relaxed text-slate-600">
                  {m.desc}
                </span>
                <ArrowUpRight
                  className="hidden h-5 w-5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-700 sm:block"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ============ ALUR ============ */}
      <section id="alur" className="scroll-mt-20 border-y border-slate-200/80 bg-slate-50 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Alur Kerja
          </p>
          <h2 className="mt-2 max-w-2xl font-serif text-3xl font-bold tracking-tight md:text-4xl">
            Setiap temuan berujung pada tindakan, bukan arsip
          </h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-5">
            {langkahAlur.map((l, i) => (
              <li key={l.title} className="bg-white p-6">
                <p className="tnum text-sm font-bold text-emerald-700">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-base font-bold">{l.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{l.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ PERAN ============ */}
      <section id="peran" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Peran Pengguna
        </p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Tampilan menyesuaikan siapa yang membuka
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-7">
            <h3 className="font-serif text-2xl font-bold">Kepala Sekolah</h3>
            <p className="mt-1 text-sm text-slate-600">
              Memegang kendali penuh atas data satu sekolah.
            </p>
            <ul className="mt-5 space-y-3 text-[15px]">
              {[
                "Menilai dan memfinalisasi supervisi guru",
                "Menetapkan dan membuka kembali keputusan kenaikan kelas",
                "Mengatur daftar kelas, wali kelas, dan tahun ajaran",
                "Memantau seluruh kelas, absensi, dan rekap sekolah",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-7">
            <h3 className="font-serif text-2xl font-bold">Guru</h3>
            <p className="mt-1 text-sm text-slate-600">
              Hanya melihat dan mengelola yang menjadi bagiannya.
            </p>
            <ul className="mt-5 space-y-3 text-[15px]">
              {[
                "Melihat hasil supervisi dan catatan pembina",
                "Memberi rekomendasi kenaikan kelas yang diwali",
                "Mengisi absensi dan melihat rekap kelas sendiri",
                "Mengatur daftar kelas yang diajar",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="px-5 pb-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-3xl bg-emerald-800 p-8 text-white md:flex-row md:items-center md:p-12">
          <Image
            src="/logo.png"
            alt="Logo SMART KASEK"
            width={88}
            height={88}
            className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover shadow-lg md:h-[88px] md:w-[88px]"
          />
          <div className="flex-1">
            <h2 className="font-serif text-2xl font-bold tracking-tight md:text-3xl">
              Mulai kelola sekolah dengan lebih tertib hari ini.
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-emerald-100/90">
              Daftarkan sekolah, bagikan kode undangan ke guru, dan biarkan
              data bekerja untuk keputusan Anda.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row md:flex-col lg:flex-row">
            <Link
              href={masukHref}
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-white px-8 text-[15px] font-bold text-emerald-900 transition-colors hover:bg-emerald-50"
            >
              {isLoggedIn ? "Masuk ke Dashboard" : "Daftar Sekarang"}
            </Link>
            {!isLoggedIn && (
              <Link
                href="/login"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/30 px-8 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-slate-200 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Logo SMART KASEK"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200"
            />
            <div>
              <p className="text-sm font-extrabold">SMART KASEK</p>
              <p className="max-w-xs text-xs leading-snug text-slate-500">
                School Management, Administration, Reflection & Teacher Growth
              </p>
            </div>
          </div>
          <div className="text-xs leading-relaxed text-slate-500">
            <p>Supervisi • Coaching • Kesiswaan • Kenaikan Kelas</p>
            <p className="mt-1">© {new Date().getFullYear()} SMART KASEK</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
