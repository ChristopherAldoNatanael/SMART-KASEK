"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth";
import { allowedClassesFor, todayISO } from "@/lib/students";
import { getTeacherClassAccess } from "./teaching-assignment.service";
import type { Database } from "@/types/database";

type Session = Database["public"]["Tables"]["attendance_sessions"]["Row"];

export type PublicSessionInfo = {
  className: string;
  academicYear: string;
  date: string;
  label: string;
  lateAfter: string | null;
  endsAt: string | null;
  isOpen: boolean;
};

export type QrCandidate = {
  studentId: string;
  fullName: string;
  className: string;
  alreadyCheckedIn: boolean;
  checkedInAt: string | null;
  checkedStatus: string | null;
};

export type QrConfirmResult = {
  fullName: string;
  status: "hadir" | "terlambat";
  checkedInAt: string;
  already: boolean;
};

const TOKEN_BYTES = 32;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

async function requireSessionAccess() {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("Akun Anda belum terhubung ke sekolah");
  if (user.role !== "principal" && user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Anda tidak memiliki akses ke absensi");
  }
  return user as typeof user & { schoolId: string };
}

function toJakartaTimestamptz(date: string, time: string): string {
  return `${date}T${time}:00+07:00`;
}

function isExpired(session: Pick<Session, "status" | "ends_at">, now: Date): boolean {
  if (session.status !== "open") return true;
  if (session.ends_at && new Date(session.ends_at).getTime() <= now.getTime()) return true;
  return false;
}

/* ------------------------- Guru: kelola sesi ------------------------- */

export async function createAttendanceSession(input: {
  academicYear: string;
  className: string;
  date: string;
  label?: string;
  lateAfter?: string;
  endsAt?: string;
}): Promise<Session> {
  const user = await requireSessionAccess();
  const schoolId = user.schoolId;
  const className = input.className.trim();
  if (!className) throw new Error("Kelas tidak valid");
  if (!DATE_RE.test(input.date)) throw new Error("Tanggal tidak valid");
  if (input.date > todayISO()) throw new Error("Tanggal sesi tidak boleh hari esok");
  if (input.lateAfter && !TIME_RE.test(input.lateAfter)) throw new Error("Batas harus HH:mm");
  if (input.endsAt && !TIME_RE.test(input.endsAt)) throw new Error("Berakhir harus HH:mm");
  if (input.lateAfter && input.endsAt && input.endsAt <= input.lateAfter) {
    throw new Error(
      `Jam berakhir (${input.endsAt}) harus setelah batas tepat waktu (${input.lateAfter}) di hari yang sama. Pakai format 24 jam — mis. 13:15 untuk jam 1 siang, bukan 01:15.`
    );
  }

  // Guru hanya boleh membuka sesi kelasnya sendiri.
  if (user.role === "teacher") {
    const access = await getTeacherClassAccess();
    const allowed = allowedClassesFor(access, input.academicYear);
    if (allowed && !allowed.includes(className)) {
      throw new Error("Anda tidak memiliki akses ke kelas ini");
    }
  }

  const supabase = await createClient();
  // MVP 1 sesi terbuka per kelas per tanggal — cegah QR ganda membingungkan.
  const { data: existing } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .eq("date", input.date)
    .eq("status", "open")
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error("Masih ada sesi terbuka untuk kelas dan tanggal ini. Tutup dulu sebelum membuat yang baru.");
  }

  const qrToken = randomBytes(TOKEN_BYTES).toString("hex");
  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      school_id: schoolId,
      class_name: className,
      academic_year: input.academicYear,
      date: input.date,
      label: input.label?.trim() || "Absensi Pagi",
      late_after: input.lateAfter ? toJakartaTimestamptz(input.date, input.lateAfter) : null,
      ends_at: input.endsAt ? toJakartaTimestamptz(input.date, input.endsAt) : null,
      status: "open",
      qr_token: qrToken,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Gagal membuat sesi absensi");
  return data as Session;
}

export async function listSessionsForClass(input: {
  academicYear: string;
  className: string;
  date: string;
}): Promise<Session[]> {
  const user = await requireSessionAccess();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("academic_year", input.academicYear)
    .eq("class_name", input.className.trim())
    .eq("date", input.date)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

export async function closeAttendanceSession(sessionId: string): Promise<void> {
  const user = await requireSessionAccess();
  const supabase = await createClient();
  const { data, error: fError } = await supabase
    .from("attendance_sessions")
    .select("id, school_id")
    .eq("id", sessionId)
    .single();
  if (fError || !data) throw new Error("Sesi tidak ditemukan");
  if ((data as { school_id: string }).school_id !== user.schoolId) {
    throw new Error("Anda tidak memiliki akses ke sesi ini");
  }
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ status: "closed" })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

export async function getSessionLiveStats(sessionId: string): Promise<{
  total: number;
  hadir: number;
  terlambat: number;
  belum: number;
}> {
  const user = await requireSessionAccess();
  const supabase = await createClient();
  const { data: session, error: sError } = await supabase
    .from("attendance_sessions")
    .select("id, school_id, class_name, academic_year")
    .eq("id", sessionId)
    .single();
  if (sError || !session) throw new Error("Sesi tidak ditemukan");
  const s = session as { school_id: string; class_name: string; academic_year: string };
  if (s.school_id !== user.schoolId) throw new Error("Anda tidak memiliki akses ke sesi ini");

  const [{ count: studentCount }, { data: records, error: rError }] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", user.schoolId)
      .eq("class_name", s.class_name)
      .eq("academic_year", s.academic_year),
    supabase
      .from("class_attendance")
      .select("status")
      .eq("session_id", sessionId),
  ]);
  if (rError) throw new Error(rError.message);
  const rows = (records ?? []) as { status: string }[];
  const hadir = rows.filter((r) => r.status === "hadir").length;
  const terlambat = rows.filter((r) => r.status === "terlambat").length;
  const total = studentCount ?? rows.length;
  return { total, hadir, terlambat, belum: Math.max(0, total - hadir - terlambat) };
}

/* ------------------------- Publik: tanpa login ------------------------- */
/* Semua fungsi publik memakai service-role dengan validasi token eksplisit.
   Tidak ada daftar siswa yang dibocorkan — hanya kandidat yang cocok. */

/**
 * Service-role untuk public flow. Error konfigurasi dicatat di server
 * dan diganti pesan user-safe — siswa tidak boleh melihat detail teknis.
 */
function serviceClient() {
  try {
    return createServiceClient();
  } catch (error) {
    console.error("QR attendance config error:", error);
    throw new Error("Layanan absensi sedang gangguan. Silakan hubungi guru.");
  }
}

async function loadSessionByToken(token: string): Promise<Session> {
  const service = serviceClient();
  const { data, error } = await service
    .from("attendance_sessions")
    .select("*")
    .eq("qr_token", token.trim())
    .single();
  if (error || !data) throw new Error("QR tidak valid. Silakan scan QR absensi yang ditampilkan guru.");
  return data as Session;
}

export async function getPublicSessionByToken(token: string): Promise<PublicSessionInfo> {
  const session = await loadSessionByToken(token);
  const now = new Date();
  const open = !isExpired(session, now);
  return {
    className: session.class_name,
    academicYear: session.academic_year,
    date: session.date,
    label: session.label,
    lateAfter: session.late_after,
    endsAt: session.ends_at,
    isOpen: open,
  };
}

function normName(v: string): string {
  return v.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function lookupStudentForSession(input: {
  token: string;
  fullName: string;
  studentCode: string;
}): Promise<QrCandidate> {
  const session = await loadSessionByToken(input.token);
  const now = new Date();
  if (isExpired(session, now)) {
    throw new Error("Sesi absensi sudah ditutup atau kedaluwarsa. Silakan hubungi guru jika ada kesalahan.");
  }
  const name = normName(input.fullName);
  const code = input.studentCode.trim();
  if (name.length < 2 || code.length < 2) throw new Error("Periksa kembali identitas Anda.");

  const service = serviceClient();
  // Ambil roster kelas (kolom minimal), cocokkan di server.
  const { data: roster, error } = await service
    .from("students")
    .select("id, full_name, student_number, no_induk, class_name")
    .eq("school_id", session.school_id)
    .eq("class_name", session.class_name)
    .eq("academic_year", session.academic_year);
  if (error) throw new Error("Absensi belum berhasil diproses. Silakan coba lagi.");
  const matches = (roster ?? []).filter(
    (s: { full_name: string; student_number: string | null; no_induk: string | null }) =>
      normName(s.full_name) === name &&
      (s.student_number === code || s.no_induk === code)
  );
  if (matches.length !== 1) {
    throw new Error("Data siswa tidak ditemukan. Periksa kembali nama dan NIS/nomor induk Anda.");
  }
  const student = matches[0] as { id: string; full_name: string; class_name: string | null };

  const { data: existing } = await service
    .from("class_attendance")
    .select("status, checked_in_at")
    .eq("session_id", session.id)
    .eq("student_id", student.id)
    .maybeSingle();
  const dup = existing as { status: string; checked_in_at: string | null } | null;
  if (dup) {
    return {
      studentId: student.id,
      fullName: student.full_name,
      className: session.class_name,
      alreadyCheckedIn: true,
      checkedInAt: dup.checked_in_at,
      checkedStatus: dup.status,
    };
  }
  return {
    studentId: student.id,
    fullName: student.full_name,
    className: session.class_name,
    alreadyCheckedIn: false,
    checkedInAt: null,
    checkedStatus: null,
  };
}

export async function confirmAttendanceForSession(input: {
  token: string;
  studentId: string;
  studentCode: string;
}): Promise<QrConfirmResult> {
  const session = await loadSessionByToken(input.token);
  // Server time = satu-satunya sumber waktu.
  const now = new Date();
  if (isExpired(session, now)) {
    throw new Error("Sesi absensi sudah ditutup atau kedaluwarsa. Silakan hubungi guru jika ada kesalahan.");
  }
  const service = serviceClient();
  const { data: student, error: sError } = await service
    .from("students")
    .select("id, full_name, student_number, no_induk")
    .eq("id", input.studentId)
    .eq("school_id", session.school_id)
    .single();
  if (sError || !student) throw new Error("Data siswa tidak ditemukan. Periksa kembali identitas Anda.");
  const st = student as { full_name: string; student_number: string | null; no_induk: string | null };
  if (st.student_number !== input.studentCode.trim() && st.no_induk !== input.studentCode.trim()) {
    throw new Error("Verifikasi gagal. Periksa kembali identitas Anda.");
  }

  // Idempotent: sudah absen → kembalikan record lama, jangan duplikat.
  const { data: existing } = await service
    .from("class_attendance")
    .select("status, checked_in_at")
    .eq("session_id", session.id)
    .eq("student_id", input.studentId)
    .maybeSingle();
  const dup = existing as { status: string; checked_in_at: string | null } | null;
  if (dup) {
    return {
      fullName: st.full_name,
      status: dup.status === "terlambat" ? "terlambat" : "hadir",
      checkedInAt: dup.checked_in_at ?? now.toISOString(),
      already: true,
    };
  }

  const status: "hadir" | "terlambat" =
    session.late_after && now.getTime() > new Date(session.late_after).getTime()
      ? "terlambat"
      : "hadir";

  const { error: iError } = await service.from("class_attendance").insert({
    school_id: session.school_id,
    student_id: input.studentId,
    class_name: session.class_name,
    academic_year: session.academic_year,
    date: session.date,
    status,
    session_id: session.id,
    checked_in_at: now.toISOString(),
    check_in_method: "qr",
    recorded_by: null,
  });
  // Race condition: UNIQUE(session_id, student_id) menang — baca ulang.
  if (iError) {
    const { data: retry } = await service
      .from("class_attendance")
      .select("status, checked_in_at")
      .eq("session_id", session.id)
      .eq("student_id", input.studentId)
      .maybeSingle();
    const r = retry as { status: string; checked_in_at: string | null } | null;
    if (r) {
      return {
        fullName: st.full_name,
        status: r.status === "terlambat" ? "terlambat" : "hadir",
        checkedInAt: r.checked_in_at ?? now.toISOString(),
        already: true,
      };
    }
    throw new Error("Absensi belum berhasil disimpan. Silakan coba lagi.");
  }

  return { fullName: st.full_name, status, checkedInAt: now.toISOString(), already: false };
}
