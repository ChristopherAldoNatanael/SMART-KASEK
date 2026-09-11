"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSchool,
  ensureProfile,
  joinSchool,
} from "@/services/school.service";
import {
  chooseRoleSchema,
  createSchoolSchema,
  firstIssueMessage,
  joinSchoolSchema,
} from "@/schemas/onboarding";

export type OnboardingActionState = {
  ok: boolean;
  error: string | null;
};

export async function chooseRoleAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const parsed = chooseRoleSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await ensureProfile(parsed.data.role);
  } catch (error) {
    console.error("chooseRoleAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan peran",
    };
  }

  // Profil baru pasti belum bersekolah → kembali ke onboarding untuk
  // langkah berikutnya (tanpa mampir dashboard agar tak ada kedipan).
  revalidatePath("/onboarding");
  redirect("/onboarding");
}

export async function createSchoolAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const parsed = createSchoolSchema.safeParse({
    name: formData.get("name"),
    npsn: formData.get("npsn"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await createSchool({
      name: parsed.data.name,
      npsn: parsed.data.npsn,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
    });
  } catch (error) {
    console.error("createSchoolAction error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal membuat sekolah",
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function joinSchoolAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const parsed = joinSchoolSchema.safeParse({
    code: formData.get("code"),
    subject: formData.get("subject"),
    homeroomClass: formData.get("homeroomClass"),
    nip: formData.get("nip"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }

  try {
    await joinSchool({
      code: parsed.data.code,
      subject: parsed.data.subject,
      homeroomClass: parsed.data.homeroomClass,
      nip: parsed.data.nip,
    });
  } catch (error) {
    console.error("joinSchoolAction error:", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Gagal bergabung ke sekolah",
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
