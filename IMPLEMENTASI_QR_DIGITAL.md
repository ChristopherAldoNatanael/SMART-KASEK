# IMPLEMENTASI QR ABSENSI DIGITAL PER KELAS — TANPA LOGIN SISWA

## ROLE

Kamu bertindak sebagai **Senior Full-Stack Engineer + System Architect + Security Reviewer + UI/UX Engineer**.

Saya ingin melakukan improvement besar pada modul **Absensi** di project yang sedang kamu kerjakan.

JANGAN langsung coding.

Sebelum mengubah apa pun, kamu WAJIB melakukan eksplorasi dan audit terhadap implementasi Absensi yang sudah ada, termasuk database, model, controller/server action, route, API, authentication, authorization, UI, relasi data, dan flow yang sudah berjalan.

Tujuan akhirnya adalah menambahkan sistem **QR Code Absensi Digital per sesi/per kelas** yang:

* Tidak membutuhkan login siswa.
* Siswa melakukan scan QR untuk memulai proses absensi.
* Setelah scan, siswa melakukan identifikasi diri.
* Ada verifikasi singkat sebelum absensi dicatat.
* Siswa melakukan konfirmasi.
* Sistem mencatat waktu absensi otomatis dari server.
* Setelah satu siswa selesai, siswa berikutnya harus **scan QR kembali**.
* Satu HP boleh digunakan bergantian oleh beberapa siswa.
* Tetapi setiap siswa hanya boleh memiliki satu absensi dalam satu sesi.
* Tidak ada tombol yang memungkinkan satu siswa langsung memilih banyak nama sekaligus.
* Tidak membuat semua siswa otomatis berstatus Hadir.
* Status awal harus **Belum Absen / kosong**.
* Data otomatis masuk ke rekap Absensi Guru dan Kepala Sekolah.
* Guru tetap mempunyai kontrol untuk membuka/menutup sesi dan melakukan koreksi jika diperlukan.
* Sistem harus dibuat profesional, sederhana, dan tidak membingungkan siswa maupun guru.

---

# 1. WAJIB EKSPLORASI PROJECT TERLEBIH DAHULU

Sebelum coding, inspect seluruh project secara menyeluruh.

Cari dan pahami:

### Absensi

* halaman absensi
* route absensi
* component absensi
* form absensi
* model absensi
* controller/server action
* API endpoint
* query database
* migration
* schema tabel
* relasi siswa
* relasi kelas
* relasi guru
* relasi user
* status kehadiran
* rekap absensi
* dashboard guru
* dashboard kepala sekolah
* permission/access control

### Authentication

Pahami bagaimana sistem sekarang menentukan:

* user login
* role
* siswa
* guru
* kepala sekolah
* admin

Jangan mengubah authentication global hanya karena fitur QR ini tidak membutuhkan login siswa.

QR attendance harus dibuat sebagai **public attendance flow yang terbatas**, bukan dengan menghapus atau melemahkan authentication sistem yang sudah ada.

### UI/UX

Audit juga:

* apakah status default sekarang otomatis "Hadir"
* bagaimana guru melihat daftar siswa
* bagaimana guru mengubah status
* bagaimana filter tanggal bekerja
* bagaimana rekap dihitung
* apakah ada loading state
* apakah ada empty state
* apakah ada error state
* apakah ada mobile responsive UI

---

# 2. JANGAN MEMBUAT ULANG MODUL ABSENSI DARI NOL

Prioritas:

> REUSE → EXTEND → REFACTOR SEPERLUNYA

Jangan membuat tabel/model baru jika struktur existing sebenarnya sudah dapat digunakan.

Sebelum membuat migration baru, jelaskan:

1. tabel absensi existing
2. kolom-kolomnya
3. relasinya
4. data apa yang sudah digunakan
5. bagian mana yang dapat direuse
6. bagian mana yang memang perlu ditambahkan

Jangan menghapus data existing.

Jangan merusak fitur absensi manual yang sudah ada kecuali memang diperlukan dan sudah dijelaskan terlebih dahulu.

---

# 3. KONSEP BARU: ATTENDANCE SESSION

QR tidak boleh dianggap sebagai "QR permanen kelas".

Gunakan konsep:

> CLASS → ATTENDANCE SESSION → QR CODE

Contoh:

```text
Kelas:
XI RPL 1

Tanggal:
20 September 2026

Sesi:
Absensi Pagi

Mulai:
07:00

Berakhir:
07:30

Status:
ACTIVE
```

Ketika guru membuat sesi, sistem membuat token QR unik.

Contoh konsep:

```text
attendance_session
    id
    class_id
    date
    start_time
    end_time
    status
    qr_token
    created_by
    created_at
```

Nama kolom harus disesuaikan dengan convention project existing.

Jangan copy struktur di atas secara mentah sebelum memahami database existing.

---

# 4. QR CODE

QR Code harus berisi URL/token yang mengarah ke halaman public attendance.

Contoh konsep:

```text
/attendance/scan/{secure-token}
```

atau sesuai routing project.

Jangan menggunakan:

```text
/attendance?class_id=1
```

sebagai satu-satunya mekanisme keamanan.

Token harus:

* unik
* sulit ditebak
* tidak menggunakan ID incremental sebagai secret
* memiliki entropy yang cukup
* terkait dengan attendance session
* bisa divalidasi server-side
* hanya berlaku selama session aktif

Jangan menyimpan informasi sensitif siswa di dalam QR.

---

# 5. QR TIDAK MEMBUTUHKAN LOGIN SISWA

Ini adalah REQUIREMENT UTAMA.

Flow siswa:

```text
SCAN QR
    ↓
PUBLIC ATTENDANCE PAGE
    ↓
IDENTITAS SISWA
    ↓
VERIFIKASI SINGKAT
    ↓
KONFIRMASI
    ↓
ABSEN BERHASIL
```

Tidak boleh ada:

```text
Login
Password akun
Google Login
Session login siswa
```

Siswa tidak perlu mempunyai akun login untuk melakukan absensi QR.

Authentication guru/admin tetap berjalan seperti sebelumnya.

---

# 6. IDENTITAS SISWA

Setelah QR discan, tampilkan halaman:

```text
ABSENSI XI RPL 1

Silakan identifikasi diri Anda.

Nama
[ Pilih / cari nama ]

NIS
[ .... ]

[ Lanjutkan ]
```

Namun JANGAN langsung menggunakan nama sebagai bukti identitas.

Siswa harus melakukan verifikasi singkat.

Contoh mekanisme:

```text
Nama
+
NIS / kode siswa
```

atau mekanisme identitas ringan lain yang sesuai dengan data siswa yang sudah tersedia.

Pilih mekanisme yang:

* cepat
* mudah digunakan di HP
* tidak membutuhkan login
* tidak meminta data berlebihan
* cukup menyulitkan orang lain untuk asal memilih nama

Jangan meminta password akun sekolah jika siswa memang tidak menggunakan login.

---

# 7. PENTING: JANGAN MENAMPILKAN SEMUA DATA SENSITIF SISWA

Public attendance page tidak boleh membocorkan data siswa.

Jangan tampilkan:

* NIK
* alamat
* nomor HP
* email
* data keluarga
* informasi pribadi lainnya

Jika ada pencarian nama siswa, hindari membocorkan terlalu banyak informasi.

Pertimbangkan mekanisme:

```text
Cari nama
+
identitas tambahan
```

dan hanya tampilkan informasi minimal yang diperlukan untuk memastikan siswa yang dipilih benar.

---

# 8. FLOW DETAIL SISWA

Implementasikan flow seperti ini.

## STEP 1 — SCAN QR

Siswa scan QR yang ditampilkan guru.

Server memvalidasi:

* token valid
* session ditemukan
* session masih aktif
* tanggal/session valid
* session belum ditutup

Jika valid:

```text
Absensi XI RPL 1

Silakan lakukan absensi.
```

Jika tidak valid:

```text
QR Absensi Tidak Aktif

Sesi absensi sudah ditutup atau QR tidak valid.
```

---

# 9. STEP 2 — IDENTITAS

Tampilkan:

```text
Absensi XI RPL 1

Nama siswa
[ Cari nama... ]

NIS / kode verifikasi
[........]

[ Lanjutkan ]
```

Setelah siswa mengisi:

validasi server-side.

Jangan percaya validasi frontend.

---

# 10. STEP 3 — CEK DUPLIKASI

Sebelum menampilkan halaman konfirmasi:

SERVER WAJIB mengecek:

```text
apakah siswa ini sudah memiliki attendance record
untuk attendance_session ini?
```

Jika sudah:

```text
Anda sudah melakukan absensi.

Waktu absensi:
07:14 WIB

Status:
Hadir
```

Jangan membuat record kedua.

---

# 11. STEP 4 — KONFIRMASI

Jika belum pernah absen:

```text
Konfirmasi Absensi

Nama:
Christopher Aldo Natanael

Kelas:
XI RPL 1

Tanggal:
20 September 2026

Waktu:
07:14 WIB

Status:
Hadir

[ KONFIRMASI ABSENSI ]
```

Waktu harus berasal dari server.

Jangan mempercayai jam dari device siswa.

---

# 12. STEP 5 — ABSENSI BERHASIL

Setelah transaksi berhasil:

```text
✓ Absensi Berhasil

Christopher Aldo Natanael

Hadir
07:14 WIB

Absensi Anda sudah tercatat.
```

Setelah selesai:

JANGAN memberikan tombol:

```text
Absen siswa lain
```

JANGAN memberikan:

```text
Ganti nama
```

JANGAN mempertahankan sesi identitas siswa sebelumnya.

Jika ingin melakukan absensi siswa berikutnya menggunakan HP yang sama:

> Siswa berikutnya HARUS melakukan scan QR kembali.

Flow:

```text
Siswa A
↓
SCAN QR
↓
ABSEN
↓
SELESAI

Siswa B
↓
SCAN QR LAGI
↓
ABSEN
↓
SELESAI
```

Ini merupakan REQUIREMENT UTAMA.

---

# 13. SATU HP BOLEH DIGUNAKAN BERSAMA

Contoh:

```text
HP A

07:03
Scan QR
→ Aldo
→ Absen berhasil

07:04
Scan QR kembali
→ Daffa
→ Absen berhasil

07:05
Scan QR kembali
→ Akmal
→ Absen berhasil
```

Tetapi:

```text
Aldo
→ scan ulang
→ tidak boleh membuat record kedua
```

Jadi constraint harus berdasarkan:

```text
student_id + attendance_session_id
```

bukan berdasarkan:

```text
device_id
IP address
browser
```

---

# 14. DATABASE INTEGRITY

Ini sangat penting.

Jangan hanya melakukan:

```text
if existing:
    return error
```

di frontend/backend application layer.

Database juga harus mempunyai proteksi terhadap duplicate record jika memungkinkan sesuai database yang digunakan.

Target:

```text
UNIQUE(
    student_id,
    attendance_session_id
)
```

Sesuaikan dengan struktur database existing.

Tujuannya agar race condition tidak menghasilkan dua record absensi.

---

# 15. STATUS DEFAULT

PERUBAHAN PENTING:

Saat guru membuka daftar absensi:

JANGAN:

```text
Aldo       Hadir
Daffa      Hadir
Akmal      Hadir
```

Jika mereka belum scan.

Harus:

```text
Aldo       Belum Absen
Daffa      Belum Absen
Akmal      Belum Absen
```

atau status kosong:

```text
Aldo       —
Daffa      —
Akmal      —
```

Status:

```text
BELUM ABSEN
```

bukan:

```text
HADIR
```

---

# 16. STATUS ABSENSI

Pisahkan antara:

```text
BELUM ABSEN
HADIR
TERLAMBAT
IZIN
SAKIT
ALPA
```

Jangan otomatis mengubah:

```text
BELUM ABSEN → ALPA
```

hanya karena sesi belum diikuti.

Guru tetap dapat melakukan finalisasi.

Contoh:

```text
Sebelum finalisasi:

Aldo       Hadir
Daffa      Hadir
Akmal      Belum Absen
Narendra   Belum Absen
```

Guru dapat menentukan setelah sesi selesai:

```text
Akmal      Alpa
Narendra   Izin
```

---

# 17. PENENTUAN TERLAMBAT

Jika project membutuhkan status terlambat:

Misalnya:

```text
Sesi dimulai:
07:00

Batas tepat waktu:
07:15
```

Jika siswa melakukan absensi:

```text
07:03 → Hadir
07:14 → Hadir
07:16 → Terlambat
```

Jangan menentukan terlambat berdasarkan jam HP siswa.

Gunakan server time.

Konfigurasi batas waktu harus mengikuti desain existing dan kebutuhan sekolah.

---

# 18. GURU — MEMBUAT SESI

Guru membuka:

```text
Absensi
```

Kemudian:

```text
[ + Buat Sesi Absensi ]
```

Form:

```text
Kelas
[ XI RPL 1 ]

Tanggal
[ 20 September 2026 ]

Mulai
[ 07:00 ]

Batas
[ 07:30 ]

[ Buat Sesi ]
```

Setelah dibuat:

```text
Absensi XI RPL 1

20 September 2026
07:00 - 07:30

[ QR CODE ]

27 / 30 Siswa Sudah Absen

[ Tutup Sesi ]
```

---

# 19. LIVE RECAP

Saat siswa melakukan absensi, data guru harus dapat diperbarui.

Contoh:

```text
30 Siswa

Hadir        24
Terlambat     1
Belum Absen   5
```

Setelah Aldo absen:

```text
Hadir        25
Terlambat     1
Belum Absen   4
```

Jika project sudah memiliki realtime mechanism, gunakan mekanisme tersebut.

Jika belum ada, gunakan polling/refetch yang ringan.

Jangan menambahkan websocket/realtime infrastructure yang terlalu kompleks jika tidak diperlukan.

---

# 20. HALAMAN QR GURU

Buat UI yang nyaman untuk ditampilkan di layar/proyektor.

Contoh:

```text
┌─────────────────────────────────────┐
│                                     │
│          ABSENSI XI RPL 1           │
│                                     │
│              [ QR ]                 │
│                                     │
│         Scan untuk absensi          │
│                                     │
│        Aktif sampai 07:30           │
│                                     │
│      27 / 30 siswa sudah absen      │
│                                     │
└─────────────────────────────────────┘
```

QR harus cukup besar untuk mudah discan.

---

# 21. SECURITY

Audit dan implementasikan minimal:

### Token

Gunakan token random yang aman.

Jangan:

```text
class_id=1
```

sebagai secret.

### Server validation

Semua validasi penting harus dilakukan di server.

### Session expiration

QR/session harus memiliki waktu berlaku.

### Duplicate protection

Satu siswa satu record per session.

### Authorization

Guru hanya boleh membuat/mengelola sesi yang memang menjadi kewenangannya.

Kepala sekolah dapat melihat rekap sesuai permission existing.

### Rate limiting

Jika infrastructure/project memungkinkan, pertimbangkan rate limiting pada public attendance endpoint agar tidak mudah dispam.

Jangan membuat mekanisme security yang terlalu berat jika tidak sesuai stack existing.

---

# 22. JANGAN MENGANDALKAN DEVICE ID UNTUK IDENTITAS

Jangan membuat asumsi:

```text
1 HP = 1 siswa
```

Karena requirement kita justru:

```text
1 HP dapat digunakan banyak siswa
```

Device fingerprint/IP hanya boleh menjadi sinyal keamanan tambahan jika benar-benar diperlukan, bukan sebagai identitas utama siswa.

---

# 23. JANGAN MENGANGGAP QR = BUKTI MUTLAK ANTI TITIP ABSEN

Tujuan sistem adalah membuat flow absensi lebih terkontrol:

```text
SCAN QR
↓
IDENTITAS
↓
VERIFIKASI
↓
KONFIRMASI
↓
CATAT
```

Dan siswa berikutnya:

```text
SCAN QR LAGI
```

Namun jangan mengklaim sistem 100% mencegah titip absen secara teknis.

Guru tetap menjadi bagian penting dari kontrol proses di kelas.

UI harus membantu guru mengawasi proses tersebut, bukan menggantikan pengawasan guru.

---

# 24. REKAP GURU

Pastikan data QR attendance menggunakan sumber data yang sama dengan sistem rekap existing jika memungkinkan.

Guru harus dapat melihat:

```text
Absensi
→
Tanggal
→
Kelas
→
Sesi
```

Kemudian:

```text
Nama
Status
Jam Masuk
Keterangan
```

Contoh:

| Siswa    | Status      | Jam   |
| -------- | ----------- | ----- |
| Aldo     | Hadir       | 07:03 |
| Daffa    | Hadir       | 07:04 |
| Akmal    | Terlambat   | 07:18 |
| Narendra | Belum Absen | —     |

---

# 25. REKAP KEPALA SEKOLAH

Pastikan QR attendance otomatis masuk ke dashboard/rekap Kepala Sekolah.

Contoh:

```text
Rekap Kehadiran

Hari ini

XI RPL 1
Hadir       27
Terlambat    2
Izin         1
Sakit        0
Alpa         0
```

Jangan membuat sistem rekap kedua yang terpisah jika sistem existing sudah memiliki aggregation/query untuk absensi.

Reuse existing source of truth.

---

# 26. MOBILE-FIRST

Halaman siswa hampir pasti dibuka melalui HP.

Pastikan:

* responsive
* tombol besar
* input mudah disentuh
* tidak ada tabel desktop yang dipaksakan ke mobile
* loading jelas
* error jelas
* success jelas
* kamera QR scanner jika memang akan disediakan di web
* halaman cepat dibuka
* tidak membutuhkan login

---

# 27. ERROR STATES

Wajib desain semua kondisi berikut:

### QR tidak valid

```text
QR tidak valid.
Silakan scan QR absensi yang ditampilkan guru.
```

### Sesi sudah ditutup

```text
Sesi absensi sudah ditutup.
Silakan hubungi guru jika ada kesalahan.
```

### Sudah absen

```text
Anda sudah melakukan absensi pada sesi ini.

07:14 WIB
```

### Siswa tidak ditemukan

```text
Data siswa tidak ditemukan.
Periksa kembali identitas Anda.
```

### Server error

```text
Absensi belum berhasil disimpan.
Silakan coba lagi.
```

Jangan tampilkan stack trace/error database kepada siswa.

---

# 28. UX — JANGAN MEMBUAT SISWA BINGUNG

Target maksimal flow:

```text
SCAN
↓
IDENTITAS
↓
VERIFIKASI
↓
KONFIRMASI
↓
SELESAI
```

Jangan membuat:

```text
Login
→ OTP
→ Login lagi
→ Pilih kelas
→ Pilih sesi
→ Pilih nama
→ Form panjang
→ Konfirmasi
```

Siswa sudah mendapatkan kelas dan sesi dari QR.

Jangan meminta mereka memilih kelas lagi.

---

# 29. AUDIT UI EXISTING

Sebelum implementasi, periksa kenapa status absensi sekarang default menjadi:

```text
Hadir
```

Cari source of truth-nya.

Jangan hanya mengganti teks "Hadir" menjadi "Belum Absen".

Pastikan logic backend dan database juga benar.

Contoh yang harus diperbaiki:

```text
default status = hadir
```

menjadi konsep:

```text
tidak ada attendance record
=
belum absen
```

Sedangkan:

```text
attendance record exists
+
status = hadir
=
hadir
```

Ini penting supaya sistem tidak menghasilkan data palsu.

---

# 30. DATA MODEL YANG DIHARAPKAN

Setelah audit, berikan rekomendasi struktur.

Minimal secara konseptual harus ada:

```text
Class
   ↓
Attendance Session
   ↓
Attendance Record
   ↓
Student
```

Jika project existing sudah memiliki tabel yang ekuivalen:

> gunakan tabel existing.

Jangan membuat tabel duplikat hanya karena nama tabel berbeda.

---

# 31. MIGRATION SAFETY

Jika memang diperlukan perubahan database:

1. buat migration
2. jangan menghapus data existing
3. jangan rename kolom secara sembarangan
4. pastikan foreign key benar
5. pastikan existing records tetap valid
6. pastikan rollback memungkinkan
7. cek apakah deployment production membutuhkan langkah tambahan

Sebelum menjalankan migration destructive, STOP dan laporkan terlebih dahulu.

---

# 32. TEST CASE WAJIB

Setelah implementasi, test minimal:

### Test 1

Aldo scan QR.

Expected:

```text
Aldo → Hadir → waktu tercatat
```

### Test 2

Aldo scan QR kedua kali.

Expected:

```text
Ditolak
Sudah melakukan absensi
Tidak ada record kedua
```

### Test 3

Daffa menggunakan HP Aldo.

Flow:

```text
scan QR kembali
→ Daffa
→ verifikasi
→ absen
```

Expected:

```text
Daffa → berhasil
```

### Test 4

Daffa mencoba lagi.

Expected:

```text
Ditolak
```

### Test 5

QR expired.

Expected:

```text
Tidak dapat melakukan absensi
```

### Test 6

Sesi ditutup.

Expected:

```text
Tidak dapat melakukan absensi
```

### Test 7

Siswa belum absen.

Expected:

```text
Belum Absen
```

bukan:

```text
Hadir
```

### Test 8

Guru membuka rekap.

Expected:

Data QR attendance langsung muncul di rekap existing.

### Test 9

Kepala sekolah membuka dashboard.

Expected:

Data agregasi attendance muncul sesuai data existing.

### Test 10

Dua request absensi siswa yang sama dikirim hampir bersamaan.

Expected:

Hanya satu attendance record yang berhasil dibuat.

---

# 33. JANGAN OVERENGINEERING

Jangan langsung menambahkan:

* facial recognition
* GPS wajib
* fingerprint
* device binding
* OTP SMS
* email verification
* aplikasi mobile native
* blockchain
* websocket kompleks

kecuali memang sudah tersedia dan diperlukan oleh project.

Requirement utama:

> QR + identitas + verifikasi singkat + konfirmasi + server timestamp + one attendance per student per session + scan ulang untuk siswa berikutnya.

Buat sesederhana mungkin tetapi tetap robust.

---

# 34. OUTPUT YANG SAYA INGINKAN SEBELUM CODING

Sebelum melakukan perubahan kode, berikan laporan:

## A. Existing Architecture

Jelaskan:

* route
* component
* model
* tabel
* relasi
* API
* auth
* role
* rekap

## B. Existing Attendance Flow

Jelaskan flow saat ini dari:

```text
Guru
→ Absensi
→ input
→ database
→ rekap
```

## C. Masalah Existing

Identifikasi:

* default Hadir
* duplicate risk
* logic yang tidak sesuai
* dead code
* UI/UX issue
* security issue
* data integrity issue

## D. Proposed Architecture

Jelaskan perubahan:

```text
Teacher
→ Create Attendance Session
→ QR

Student
→ Scan QR
→ Identity
→ Verification
→ Confirmation
→ Attendance Record

Teacher
→ Live Recap

Principal
→ Recap
```

## E. Database Changes

Tampilkan tabel/kolom yang perlu ditambah atau diubah.

## F. Security Considerations

Jelaskan token, expiration, duplicate protection, authorization, dan public endpoint.

## G. UI/UX Changes

Jelaskan halaman baru dan perubahan halaman existing.

## H. Migration Plan

Jelaskan perubahan database secara aman.

## I. Test Plan

Berikan test case lengkap.

---

# 35. SETELAH LAPORAN SELESAI

Jika tidak ada blocker dan perubahan aman dilakukan:

implementasikan secara bertahap.

Urutan:

```text
1. Database / data model
2. Attendance session
3. Secure QR token
4. Public student attendance flow
5. Identity verification
6. Confirmation
7. Attendance transaction
8. Duplicate protection
9. Teacher QR/session UI
10. Teacher recap
11. Principal recap
12. UI/UX polish
13. Testing
14. Regression testing
```

Setelah setiap tahap, pastikan fitur existing tidak rusak.

---

# 36. ATURAN PALING PENTING

Jangan:

* mengarang struktur database
* mengarang route
* mengarang nama tabel
* menghapus fitur existing
* membuat duplicate module
* mengganti authentication global
* mengubah role system tanpa alasan
* hardcode student ID
* hardcode class ID
* hardcode attendance session
* mempercayai client-side timestamp
* mempercayai client-side status
* membuat default attendance = Hadir
* membuat satu scan memungkinkan memilih banyak siswa tanpa scan ulang
* menambahkan login siswa

Selalu:

> INSPECT → UNDERSTAND → PLAN → IMPLEMENT → TEST → AUDIT

Dan gunakan struktur existing project semaksimal mungkin.

---

# ACCEPTANCE CRITERIA

Implementasi dianggap berhasil jika:

* [ ] Guru dapat membuat attendance session.
* [ ] Sistem menghasilkan QR unik untuk session.
* [ ] Siswa dapat scan QR tanpa login.
* [ ] Siswa mendapatkan halaman attendance sesuai kelas/session dari QR.
* [ ] Siswa melakukan identifikasi diri.
* [ ] Ada verifikasi singkat.
* [ ] Ada halaman konfirmasi.
* [ ] Waktu attendance berasal dari server.
* [ ] Siswa berhasil tercatat sebagai Hadir/Terlambat sesuai aturan.
* [ ] Siswa yang sama tidak dapat membuat attendance kedua pada session yang sama.
* [ ] Satu HP dapat digunakan oleh siswa lain.
* [ ] Siswa berikutnya harus scan QR kembali.
* [ ] Setelah attendance selesai, identitas siswa sebelumnya tidak dapat digunakan untuk langsung mengabsen siswa lain.
* [ ] QR/session dapat expired.
* [ ] Guru dapat menutup session.
* [ ] QR yang sudah ditutup tidak dapat digunakan.
* [ ] Default siswa yang belum melakukan attendance adalah Belum Absen/kosong.
* [ ] Tidak ada default Hadir palsu.
* [ ] Rekap Guru menggunakan data attendance yang sama.
* [ ] Rekap Kepala Sekolah menggunakan data attendance yang sama.
* [ ] Tidak ada duplicate attendance record.
* [ ] Existing attendance functionality tetap berjalan.
* [ ] Tidak ada perubahan authentication global yang tidak diperlukan.
* [ ] Tidak ada data sensitif siswa yang bocor melalui public attendance page.
* [ ] Mobile UI nyaman digunakan.
* [ ] Error state jelas.
* [ ] Loading state jelas.
* [ ] Success state jelas.
* [ ] Semua test case utama berhasil.

## FINAL RULE

**Jangan langsung coding sebelum audit existing project dan memberikan laporan arsitektur terlebih dahulu.**

Saya ingin kamu memahami sistem yang sudah ada sebelum menyentuh kode.

Prioritas utama:

**PRESERVE EXISTING FUNCTIONALITY + DATA INTEGRITY + SECURITY + SIMPLE UX.**
