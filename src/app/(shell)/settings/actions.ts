"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  getMySchool,
  updateSchool,
  uploadSchoolLogo,
} from "@/services/school.service";
import {
  removeMyAvatar,
  updateMyAccountEmail,
  updateMyAccountName,
  updateMyPassword,
  uploadMyAvatar,
  applyGoogleAvatar,
} from "@/services/profile.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  ALLOWED_LOGO_TYPES,
  firstIssueMessage,
  MAX_LOGO_BYTES,
  updateSchoolSchema,
} from "@/schemas/school-settings";
import {
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_BYTES,
} from "@/schemas/account";
import {
  firstAccountIssueMessage,
  updateAccountEmailSchema,
  updateAccountNameSchema,
  updateAccountPasswordSchema,
} from "@/schemas/account";

export type SettingsActionState = {
  ok: boolean;
  error: string | null;
  logoUrl?: string | null;
};

async function requireSettingsAccess(): Promise<string | null> {
  const user = await requireUser();
  if (!user.schoolId) return "Akun Anda belum terhubung ke sekolah.";
  if (!hasRole(user.role, "principal")) {
    return "Hanya Kepala Sekolah yang dapat mengubah pengaturan sekolah.";
  }
  return null;
}

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/**
 * Save school profile fields (logo handled separately).
 */
export async function saveSchoolProfileAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const denied = await requireSettingsAccess();
  if (denied) return { ok: false, error: denied };

  const parsed = updateSchoolSchema.safeParse({
    name: formData.get("name"),
    npsn: formData.get("npsn"),
    address: formData.get("address"),
    village: formData.get("village"),
    district: formData.get("district"),
    city: formData.get("city"),
    province: formData.get("province"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    principalName: formData.get("principalName"),
    principalNip: formData.get("principalNip"),
    logoSize: formData.get("logoSize"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    const school = await updateSchool({
      name: parsed.data.name,
      npsn: parsed.data.npsn,
      address: parsed.data.address,
      village: parsed.data.village,
      district: parsed.data.district,
      city: parsed.data.city,
      province: parsed.data.province,
      phone: parsed.data.phone,
      email: parsed.data.email,
      principalName: parsed.data.principalName,
      principalNip: parsed.data.principalNip,
      logoSize: parsed.data.logoSize,
    });
    await logAuditEvent({
      action: "update",
      entity: "schools",
      entityId: school.id,
      newData: { name: school.name },
    });
  } catch (error) {
    console.error("saveSchoolProfileAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan profil sekolah",
    };
  }

  revalidateSettings();
  return { ok: true, error: null };
}

async function requireAccountAccess(): Promise<string | null> {
  const user = await requireUser();
  if (!user.schoolId) return "Akun Anda belum terhubung ke sekolah.";
  return null;
}

/** Ubah nama lengkap sendiri (semua peran). */
export async function updateAccountNameAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const blocked = await requireAccountAccess();
  if (blocked) return { ok: false, error: blocked };

  const parsed = updateAccountNameSchema.safeParse({
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstAccountIssueMessage(parsed.error) };
  }

  try {
    await updateMyAccountName(parsed.data.fullName);
    await logAuditEvent({
      action: "update",
      entity: "profiles",
      newData: { full_name: parsed.data.fullName.trim() },
    });
  } catch (error) {
    console.error("updateAccountNameAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan nama",
    };
  }

  revalidateSettings();
  return { ok: true, error: null };
}

/** Ubah email sendiri (semua peran, terkirim konfirmasi bila aktif). */
export async function updateAccountEmailAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const blocked = await requireAccountAccess();
  if (blocked) return { ok: false, error: blocked };

  const parsed = updateAccountEmailSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstAccountIssueMessage(parsed.error) };
  }

  try {
    await updateMyAccountEmail(parsed.data.email);
    await logAuditEvent({
      action: "update",
      entity: "profiles",
      newData: { email: parsed.data.email },
    });
  } catch (error) {
    console.error("updateAccountEmailAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan email",
    };
  }

  revalidateSettings();
  return { ok: true, error: null };
}

/** Ganti kata sandi sendiri (semua peran). */
export async function updateAccountPasswordAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const blocked = await requireAccountAccess();
  if (blocked) return { ok: false, error: blocked };

  const parsed = updateAccountPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstAccountIssueMessage(parsed.error) };
  }

  try {
    await updateMyPassword(parsed.data.password);
    await logAuditEvent({ action: "update", entity: "profiles", newData: {} });
  } catch (error) {
    console.error("updateAccountPasswordAction error:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Gagal mengganti kata sandi",
    };
  }

  return { ok: true, error: null };
}

/**
 * Upload a new school logo (PNG/JPG/WebP/SVG, maks 2 MB).
 */
export async function uploadLogoAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const denied = await requireSettingsAccess();
  if (denied) return { ok: false, error: denied };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih berkas logo terlebih dahulu." };
  }
  if (!ALLOWED_LOGO_TYPES.includes(file.type as (typeof ALLOWED_LOGO_TYPES)[number])) {
    return { ok: false, error: "Format logo harus PNG, JPG, WebP, atau SVG." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Ukuran logo maksimal 2 MB." };
  }

  try {
    const url = await uploadSchoolLogo(file);
    // RPC mewajibkan nama — teruskan nama yang sudah ada agar tak berubah.
    const current = await getMySchool();
    if (!current) throw new Error("Akun Anda belum terhubung ke sekolah.");
    const school = await updateSchool({ name: current.name, logoUrl: url });
    await logAuditEvent({
      action: "update",
      entity: "schools",
      entityId: school.id,
      newData: { logo_url: url },
    });
    revalidateSettings();
    return { ok: true, error: null, logoUrl: url };
  } catch (error) {
    console.error("uploadLogoAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal mengunggah logo",
    };
  }
}

/** Unggah foto profil sendiri (PNG/JPG/WebP, maks 2 MB, semua peran). */
export async function uploadAvatarAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const blocked = await requireAccountAccess();
  if (blocked) return { ok: false, error: blocked };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih berkas foto terlebih dahulu." };
  }
  if (
    !ALLOWED_AVATAR_TYPES.includes(
      file.type as (typeof ALLOWED_AVATAR_TYPES)[number]
    )
  ) {
    return { ok: false, error: "Format foto harus PNG, JPG, atau WebP." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Ukuran foto maksimal 2 MB." };
  }

  try {
    await uploadMyAvatar(file);
    await logAuditEvent({ action: "update", entity: "profiles", newData: {} });
  } catch (error) {
    console.error("uploadAvatarAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal mengunggah foto",
    };
  }

  revalidateSettings();
  return { ok: true, error: null };
}

/** Kembali memakai foto Google (menghapus foto custom). */
export async function useGoogleAvatarAction(
  _prev: SettingsActionState
): Promise<SettingsActionState> {
  const blocked = await requireAccountAccess();
  if (blocked) return { ok: false, error: blocked };

  try {
    await applyGoogleAvatar();
  } catch (error) {
    console.error("useGoogleAvatarAction error:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Gagal memakai foto Google",
    };
  }

  revalidateSettings();
  return { ok: true, error: null };
}

/** Hapus foto profil custom. */
export async function removeAvatarAction(
  _prev: SettingsActionState
): Promise<SettingsActionState> {
  const blocked = await requireAccountAccess();
  if (blocked) return { ok: false, error: blocked };

  try {
    await removeMyAvatar();
  } catch (error) {
    console.error("removeAvatarAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghapus foto",
    };
  }

  revalidateSettings();
  return { ok: true, error: null };
}
