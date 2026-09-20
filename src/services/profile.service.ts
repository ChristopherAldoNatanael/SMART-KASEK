"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getMyTeacher, type TeacherWithProfile } from "./teacher.service";

export type MyCompetency = {
  name: string;
  category: string;
  score: number | null;
  assessedAt: string | null;
  source: string | null;
};

export type MySnapshot = {
  period: string;
  overall_score: number | null;
  pedagogic_score: number | null;
  professional_score: number | null;
  social_score: number | null;
  personality_score: number | null;
  digital_score: number | null;
  assessment_score: number | null;
  classroom_score: number | null;
};

export type MySupervision = {
  id: string;
  supervision_date: string;
  overall_score: number | null;
  status: string;
  strengths: string | null;
  improvements: string | null;
};

export type MyCoaching = {
  id: string;
  session_date: string;
  focus_area: string | null;
  status: string;
  pendingActions: number;
  completedActions: number;
};

export type MyProfileData = {
  teacher: TeacherWithProfile;
  competencies: MyCompetency[];
  snapshots: MySnapshot[];
  supervisions: MySupervision[];
  coachings: MyCoaching[];
};

export type MyAccount = {
  fullName: string;
  email: string;
  role: string;
  schoolName: string | null;
  isActive: boolean;
  joinedAt: string;
  /** Cara masuk: google (tanpa kata sandi) atau email (pakai kata sandi). */
  loginWith: "google" | "email";
  /** Foto tampil: avatar custom bila ada, jika tidak foto Google. */
  avatarUrl: string | null;
  /** Foto dari Google (null bila login email / Google tanpa foto). */
  googleAvatarUrl: string | null;
  /** True bila foto tampil berasal dari unggahan sendiri. */
  hasCustomAvatar: boolean;
};

/** Ambil URL foto Google dari metadata auth (avatar_url / picture). */
function googlePhotoFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata) return null;
  const raw =
    metadata.avatar_url ?? metadata.picture ?? metadata.profile_image;
  return typeof raw === "string" && raw.startsWith("http") ? raw : null;
}

/**
 * Data "Akun Saya" untuk semua peran: nama, email, peran, sekolah.
 * Dibaca dari baris profil milik sendiri (RLS: own-select).
 */
export async function getMyAccount(): Promise<MyAccount | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  // user.id = ID baris profiles (lihat lib/auth) — bukan auth_user_id.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, email, role, is_active, created_at, school_id, avatar_url")
    .eq("id", user.id)
    .single();
  if (error || !profile) return null;
  const row = profile as {
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    school_id: string | null;
    avatar_url: string | null;
  };
  let schoolName: string | null = null;
  if (row.school_id) {
    const { data: school } = await supabase
      .from("schools")
      .select("name")
      .eq("id", row.school_id)
      .single();
    schoolName = (school as { name?: string } | null)?.name ?? null;
  }
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const loginWith =
    (authUser?.app_metadata as { provider?: string } | null)?.provider ===
    "google"
      ? "google"
      : "email";
  const googleAvatarUrl = googlePhotoFromMetadata(
    authUser?.user_metadata as Record<string, unknown> | null
  );
  const avatarUrl = row.avatar_url?.trim() || googleAvatarUrl;
  return {
    fullName: row.full_name,
    email: row.email || user.email,
    role: row.role,
    schoolName,
    isActive: row.is_active,
    joinedAt: row.created_at,
    loginWith,
    avatarUrl,
    googleAvatarUrl,
    hasCustomAvatar: Boolean(row.avatar_url?.trim()),
  };
}

/** Ubah nama lengkap sendiri (semua peran, RLS: own-update). */
export async function updateMyAccountName(fullName: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");
  const clean = fullName.trim();
  if (clean.length < 3) throw new Error("Nama minimal 3 karakter");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: clean.slice(0, 200) })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

/**
 * Ubah email sendiri: Auth dulu (mengirim konfirmasi ke alamat baru
 * bila verifikasi email aktif), lalu baris profil agar tampilan sinkron.
 */
export async function updateMyAccountEmail(email: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    throw new Error("Alamat email tidak valid");
  }
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.updateUser({ email: clean });
  if (authError) throw new Error(authError.message);
  const { error } = await supabase
    .from("profiles")
    .update({ email: clean })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

/**
 * Ganti kata sandi sendiri (minimal 6 karakter).
 * Khusus login email — akun Google tidak memakai kata sandi.
 */
export async function updateMyPassword(password: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");
  if (password.length < 6) throw new Error("Kata sandi minimal 6 karakter");
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (
    (authUser?.app_metadata as { provider?: string } | null)?.provider ===
    "google"
  ) {
    throw new Error(
      "Akun ini masuk dengan Google sehingga tidak memakai kata sandi"
    );
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

function avatarExtension(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

/**
 * Unggah foto profil custom ke bucket `avatars` lalu simpan public URL
 * ke profiles.avatar_url milik sendiri.
 */
export async function uploadMyAvatar(file: File): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Sesi berakhir. Silakan login kembali.");

  const path = `${authUser.id}/avatar-${Date.now()}.${avatarExtension(file.type)}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = `${base.replace(/\/$/, "")}/storage/v1/object/public/avatars/${path}`;
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  return url;
}

/**
 * Pakai foto Google sebagai foto profil (kosongkan avatar custom
 * sehingga tampilan jatuh ke foto Google).
 */
export async function applyGoogleAvatar(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const googleUrl = googlePhotoFromMetadata(
    authUser?.user_metadata as Record<string, unknown> | null
  );
  if (!googleUrl)
    throw new Error("Akun ini tidak memiliki foto Google yang bisa dipakai.");
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

/** Hapus foto profil custom (tampilan kembali ke inisial / foto Google). */
export async function removeMyAvatar(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

/**
 * Sinkronisasi senyap foto Google saat OAuth callback: bila profil
 * belum punya avatar custom, simpan foto Google agar top nav
 * langsung menampilkan foto tanpa perlu upload manual.
 * Best-effort — kegagalan tidak menggagalkan login.
 */
export async function syncGoogleAvatarIfEmpty(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;
    const googleUrl = googlePhotoFromMetadata(
      authUser.user_metadata as Record<string, unknown> | null
    );
    if (!googleUrl) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .eq("auth_user_id", authUser.id)
      .single();
    const row = profile as { id: string; avatar_url: string | null } | null;
    if (!row || row.avatar_url?.trim()) return;
    await supabase
      .from("profiles")
      .update({ avatar_url: googleUrl })
      .eq("id", row.id);
  } catch (error) {
    console.error("syncGoogleAvatarIfEmpty warning:", error);
  }
}

/**
 * All "Profil Saya" data for the logged-in teacher, scoped to their
 * own teachers row. Returns null when the account isn't linked to
 * teacher data. Teachers never touch principal-gated services here.
 */
export async function getMyProfileData(): Promise<MyProfileData | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;

  const teacher = await getMyTeacher();
  if (!teacher) return null;

  const supabase = await createClient();
  const teacherId = teacher.id;

  const [{ data: competencies }, { data: snapshots }, { data: supervisions }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("teacher_competencies")
        .select(
          "score, assessed_at, source, competency:competencies(name, category, is_active)"
        )
        .eq("teacher_id", teacherId)
        .order("assessed_at", { ascending: false }),
      supabase
        .from("teacher_growth_snapshots")
        .select(
          "period, overall_score, pedagogic_score, professional_score, social_score, personality_score, digital_score, assessment_score, classroom_score"
        )
        .eq("teacher_id", teacherId)
        .order("period", { ascending: true }),
      supabase
        .from("supervisions")
        .select("id, supervision_date, overall_score, status, strengths, improvements")
        .eq("teacher_id", teacherId)
        .order("supervision_date", { ascending: false })
        .limit(10),
      supabase
        .from("coaching_sessions")
        .select(
          "id, session_date, focus_area, status, actions:coaching_actions(status)"
        )
        .eq("teacher_id", teacherId)
        .order("session_date", { ascending: false })
        .limit(10),
    ]);

  return {
    teacher,
    competencies: (competencies ?? [])
      .filter((c) => {
        const comp = c.competency as unknown as {
          is_active?: boolean | null;
        } | null;
        // Sembunyikan dimensi yang dinonaktifkan (00021);
        // baris yatim (master terhapus) tetap tampil apa adanya.
        return comp?.is_active !== false;
      })
      .map((c) => {
        const comp = c.competency as unknown as {
          name: string;
          category: string;
        } | null;
        return {
          name: comp?.name ?? "—",
          category: comp?.category ?? "—",
          score: c.score,
          assessedAt: c.assessed_at,
          source: c.source,
        };
      }),
    snapshots: (snapshots ?? []) as MySnapshot[],
    supervisions: (supervisions ?? []) as MySupervision[],
    coachings: (sessions ?? []).map((s) => {
      const actions = (s.actions ?? []) as { status: string }[];
      return {
        id: s.id,
        session_date: s.session_date,
        focus_area: s.focus_area,
        status: s.status,
        pendingActions: actions.filter(
          (a) => a.status === "pending" || a.status === "in_progress"
        ).length,
        completedActions: actions.filter((a) => a.status === "completed").length,
      };
    }),
  };
}
