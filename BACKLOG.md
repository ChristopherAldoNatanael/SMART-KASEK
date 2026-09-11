# BACKLOG — SMART KASEK

Catatan kekurangan & utang teknis proyek. Terverifikasi dari inspeksi kode
(bukan asumsi). Diperbarui setiap ronde pengerjaan.

Format status: `[ ]` belum dikerjakan · `[x]` selesai · `(ronde-N)` kapan selesai/diverifikasi.

---

## 1. Riwayat ronde (selesai)

- [x] (ronde-1) Fix crash `/coaching`: `getCoachingStats` mengirim `schoolId: null`
      sebagai filter uuid → `invalid input syntax for type uuid: "null"`.
      Pola guard disamakan dengan `getSupervisionStats`.
- [x] (ronde-2, Task 11) Coaching selesai s.d. Definition of Done:
      form Tambah Sesi, kelola tindak lanjut, validasi Zod, server actions
      + gate principal, audit log, hardening `updateCoachingAction` (school scoping).
- [x] (ronde-3, Task 12) Teacher Growth: engine `recalculateTeacherGrowth`
      (deterministik dari `teacher_competencies`), auto-update saat tindak lanjut
      completed, rewrite `/growth` (sebelumnya placeholder), fix `|| null` → `?? null`,
      hapus N+1 di rata-rata sekolah.
- [x] (ronde-4, Task 13–14) AI Context Engine + AI Coach: provider
      OpenAI-compatible di balik `IAIProvider` (env-switchable, mock fallback),
      teacher context di-scope sekolah, guard `schoolId!`, prompt FACT/INFERENCE/
      RECOMMENDATION, disclaimer + CTA coaching di halaman AI Coach.
- [x] (ronde-5, Task 15–16) School Insight + Early Warning hybrid: rule engine
      deterministik (`src/lib/early-warning/rules.ts`, severity murni dari aturan),
      `warning.service` (deteksi live, simpan dedup, resolve, AI hanya menjelaskan),
      rewrite `/ai/early-warning` + `/ai/insight` (data nyata + insight tersimpan),
      dashboard diisi angka nyata dari DB (menutup pelanggaran §28).

---

## 2. Kekurangan terverifikasi (belum dikerjakan)

### P0 — Inti lomba (dikerjakan lebih dulu)

- [x] (ronde-5) **Dashboard angka statis** — telah diisi angka nyata
      (growth overview + coaching + supervisi + warning aktif). Catatan: ringkasan
      penuh hanya untuk principal/admin; guru melihat pesan peran (lihat item
      "Akses guru" di bawah).

- [x] (ronde-6, Task 10 susulan) Supervisi DoD penuh: form Tambah Supervisi
      (indikator dinamis 0–100, skor overall otomatis dari service), server actions
      + gate principal + audit, guard `schoolId` di byId/teacher/update/delete,
      ubah status di halaman detail, CTA "Buat Coaching dari Supervisi Ini"
      (preselect guru + supervisi di form coaching).
- [x] (ronde-7, Onboarding dua role) Investigasi + implementasi onboarding tanpa
      admin: migrasi `00003_onboarding.sql` (school_id nullable, `invite_code`,
      RPC `ensure_profile`/`create_school`/`join_school`), halaman `/onboarding`
      berbasis state (no_profile/needs_school/ready/error), dashboard redirect
      ke onboarding, 6 pesan + 3 error string "Hubungi/admin" diganti CTA
      onboarding, kunci delete coaching/supervisi ke principal di service layer.

### P1 — Modul pendukung (SMART-KASEK.md §32, AGENTS.md §36)

Halaman masih placeholder "Modul ini akan segera tersedia":

- [ ] `src/app/learning/page.tsx:42` (Jurnal, Modul Ajar, Asesmen)
- [ ] `src/app/students/page.tsx:30` (Kesiswaan)
- [ ] `src/app/administration/page.tsx:42` (Administrasi)
- [ ] `src/app/settings/page.tsx:30` (Pengaturan)

### Akses guru (janji SMART-KASEK.md §2 belum dipenuhi)

- [ ] Role `teacher` di-redirect ke `/dashboard` oleh `requirePrincipal` sehingga
      **tidak bisa membuka** `/growth` dan halaman AI. Padahal SMART-KASEK.md
      menjanjikan guru melihat Supervisi Saya, Coaching, AI Coach miliknya.
      Perlu: kebijakan akses "guru hanya data sendiri" di service + halaman.

### AI Assistant belum jadi asisten (§14)

- [ ] Tidak ada tool layer (`src/lib/ai/tools.ts` tidak ada;
      `get_teacher_profile()`, `get_supervision_summary()`, dll. belum diimplementasikan).
      Assistant saat ini prompt-only dengan konteks sekolah mentah.

### Onboarding susulan (ditemukan ronde-7, belum dikerjakan)

- [ ] `createTeacher` (`src/services/teacher.service.ts:86,112,135`) memanggil
      `supabase.auth.admin.*` lewat **anon client** — selalu gagal tanpa service
      key, dan merupakan penyalahgunaan privilege. Perlu: pakai `createAdminClient`
      + `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` (saat ini kunci tersebut
      **tidak ada** — hanya URL + anon key), atau ganti alur Tarik-Guru-Jadi-User.
- [ ] `createTeacher` menulis `profile_id: authData.user.id`
      (`teacher.service.ts:117`) — ID salah (harus `profiles.id`, bukan auth id).
      Join RPC ronde-7 sudah menulis `profile_id` dengan benar; baris lama dari
      path ini perlu audit data.
- [ ] `signup` (`src/lib/auth/actions.ts:42`) tidak punya halaman UI dan insert
      profil tanpa sekolah lewat anon client (terblokir RLS `profiles_insert`).
      Putuskan: hapus, atau hubungkan ke flow `/onboarding`.
- [x] (ronde-8) UI kode undangan: kartu "Kode Undangan Sekolah" + tombol
      Salin di dashboard Kepala Sekolah (`InviteCodeCard`). `getMySchoolInviteCode`
      dibuat tahan-gagal bila migrasi 00003 belum diterapkan (return null +
      pesan instruksi di kartu, bukan crash).
- [x] (ronde-9) Sidebar per-role (`nav-items.ts`): principal = menu penuh,
      guru = Dashboard/Supervisi/Coaching/Pembelajaran (hanya halaman yang
      memang bisa dibuka guru; growth & AI disembunyikan sampai akses
      teacher-scoped ada). Label peran di header dilokalkan.
- [x] (ronde-9) Modul Ajar terintegrasi: `lesson.service` + `/learning` (list)
      + `/learning/new` (form). Guru input sebagai dirinya sendiri (diabaikan
      bila memaksa teacherId lain); Kepala Sekolah melihat semua modul sekolah
      + hapus. Migrasi `00004` menambahkan `is_principal()` ke policy
      `lesson_plans_delete` (insert/update sudah memilikinya).
- [x] (ronde-10) Redesain UI/UX anti-slop: tema kertas hangat + tinta + aksen
      zamrud tunggal, sidebar gelap + grup Kecerdasan, primitives
      (`PageHeader/Stat/Empty/Badge/Panel/TableShell`), angka tabular,
      seluruh halaman inti + AI + onboarding + login + stub diseragamkan.
      Murni visual, logika tidak diubah.
- [x] (ronde-11) App shell menetap: semua halaman pindah ke grup `(shell)`
      (URL tidak berubah) dengan layout bersama — sidebar + topbar selalu
      terlihat, tidak ada lagi halaman fullscreen. Sidebar collapsible di
      desktop (rail ikon, preferensi tersimpan) + drawer geser dengan backdrop
      di mobile. `mobile-nav.tsx` dihapus (diganti `SidebarDrawer`).
- [x] (ronde-12) Pengaturan fungsional: form profil satuan pendidikan
      (nama, NPSN, alamat, desa, kec, kab/kota, prov, telp, email, nama+NIP
      kepsek — editable via RPC `update_school`), upload logo
      (PNG/JPG/WebP/SVG ≤2 MB, bucket `school-logos` + policies) + pengaturan
      ukuran logo 24–64 px. Sidebar (desktop, drawer, ciut) menampilkan logo +
      nama sekolah; guru otomatis mengikuti sekolahnya. Migrasi `00005`.
- [ ] Regenerate kode undangan belum ada (lihat+salin sudah ada ronde-8).
- [x] (ronde-13) Audit dummy total: semua link exiting route; tombol Hapus
      Supervisi/Coaching (konfirmasi + redirect, service sudah terkunci
      principal); **input nilai kompetensi** di profil guru (dropdown master +
      skor + sumber → upsert + growth recalc + audit). Modul guru/detail tetap
      tanpa tambah/edit/hapus data guru (createTeacher rusak — item di bawah);
      guru baru masuk via alur undangan `/onboarding`.

### Kualitas & rilis (Task 17–20)

- [ ] **Testing**: belum ada test runner sama sekali di `package.json`
      (belum ada unit/integration/RLS/critical-flow test — AGENTS.md §31).
- [ ] **Dead code**: `createAdminClient` (`src/lib/supabase/admin.ts:3`) diekspor
      tapi tidak dipakai di mana pun (terverifikasi ronde-6). putuskan: pakai untuk
      operasi admin/seed terjadwal, atau hapus agar service-role client tidak
      menganggur. File-nya server-only sehingga tidak ada eksposur saat ini.
- [ ] **Seed demo** (`supabase/seed-demo.sql`) belum mencakup coaching sessions,
      coaching actions, dan snapshot multi-periode — padahal demo Scene 7–9
      butuh alur Supervisi → Coaching → Follow-up → Growth 65% → 74%.
- [ ] **Deployment**: belum ada checklist deploy Vercel + env produksi (Task 20).

---

## 3. Sudah diverifikasi AMAN (tidak perlu dikerjakan)

- RLS `competencies_select USING (true)` (`00002_rls_policies.sql:181`) — **sah**,
  master kompetensi bersifat global; hanya SELECT, mutasi tetap `is_admin()`.
- `UNIQUE(teacher_id, period)` pada `teacher_growth_snapshots` ada
  (`00001_initial_schema.sql:240`) — upsert snapshot aman dari duplikat.
- Tanpa `AI_API_KEY`, AI kembali ke Mock dengan pesan jujur (by design, tanpa biaya).

---

## 4. Konvensi

- Setiap ronde: kerjakan item, verifikasi (`tsc`, `lint`, `build`), lalu pindahkan
  item ke §1 dengan nomor ronde.
- Jangan menambah item tanpa jejak file:baris hasil inspeksi.

---

## 5. Insiden operasional (solusi tercatat)

- **Dev server 500 `Cannot find module './vendor-chunks/zod.js`** (semua halaman
  yang menyentuh zod: dashboard, dsb. — `/teachers` yang tidak menyentuh zod
  tetap 200). Penyebab: cache dev `.next` korup/stale, BUKAN salah kode
  (`npm run build` dari nol selalu hijau, `zod@4.6.1` terinstal benar).
  Solusi: hentikan dev server → `Remove-Item .next -Recurse -Force` →
  `npm run dev`. Jangan edit kode aplikasi untuk error ini.
- Warning Watchpack `EINVAL lstat C:\hiberfil.sys|pagefile.sys` tidak fatal
  (dev watcher menyentuh root drive); pastikan `npm run dev` dijalankan dari
  folder proyek. Abaikan bila halaman tetap ter-compile.
- **Server action 500 `A "use server" file can only export async functions,
  found object`** (ditemukan di `/onboarding`, berlaku untuk SEMUA actions).
  Penyebab: konstanta `initial*ActionState` diekspor dari file `"use server"`.
  Aturan Next: file tersebut hanya boleh mengekspor fungsi async (tipe OK karena
  terhapus saat compile). Solusi (diterapkan ronde-7): hapus semua ekspor objek
  dari 4 actions (onboarding/coaching/supervision/early-warning), definisikan
  state awal inline di komponen client. `tsc`/`build` TIDAK menangkap ini —
  hanya muncul saat action dieksekusi di dev.
