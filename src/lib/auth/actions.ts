"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/services/school.service";

export type AuthState = {
  error?: string;
  success?: boolean;
  /** True bila akun dibuat tetapi email belum dikonfirmasi. */
  needsConfirmation?: boolean;
};

export async function login(
  _prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan password wajib diisi" };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: "Email atau password salah" };
    }
  } catch (err) {
    console.error("login error:", err);
    return {
      error:
        "Tidak dapat menghubungi server login. Periksa koneksi, lalu coba lagi.",
    };
  }

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signup(
  _prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const role = formData.get("role") as string;

  if (!email || !password || !fullName) {
    return { error: "Nama, email, dan password wajib diisi" };
  }

  if (password.length < 6) {
    return { error: "Password minimal 6 karakter" };
  }

  if (role !== "principal" && role !== "teacher") {
    return { error: "Pilih peran: Guru atau Kepala Sekolah" };
  }

  const supabase = await createClient();

  // Create auth user
  let authData;
  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (result.error) {
      return { error: result.error.message };
    }
    authData = result.data;
  } catch (error) {
    console.error("signup error:", error);
    return {
      error:
        "Tidak dapat menghubungi server. Periksa koneksi, lalu coba lagi.",
    };
  }

  if (!authData.user) {
    return { error: "Gagal membuat akun" };
  }

  // Langsung login (konfirmasi email nonaktif di Supabase) → buat profil
  // via RPC (RLS memblokir insert profil langsung). Profil baru pasti
  // belum bersekolah → langsung ke onboarding (tanpa mampir dashboard
  // agar tidak ada kedipan redirect ganda).
  if (authData.session) {
    try {
      await ensureProfile(role);
    } catch (error) {
      console.error("signup ensureProfile error:", error);
      return {
        error:
          error instanceof Error ? error.message : "Gagal membuat profil",
      };
    }
    redirect("/onboarding");
  }

  // Konfirmasi email aktif → user klik tautan email, lalu memilih peran
  // di halaman onboarding (ensure_profile di sana).
  return { success: true, needsConfirmation: true };
}
