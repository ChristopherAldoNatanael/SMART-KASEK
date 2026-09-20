import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMySchool } from "@/services/school.service";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Shell chrome only — every page still enforces
  // its own server-side authorization.
  // No active profile → onboarding (outside the shell group, so no loop).
  // redirect() is called outside try/catch because it works by throwing.
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    redirect("/onboarding");
  }

  const role: string | null = user.role;
  const fullName = user.fullName;
  const roleLabel =
    user.role === "principal"
      ? "Kepala Sekolah"
      : user.role === "teacher"
        ? "Guru"
        : user.role;
  let school: {
    name: string;
    logoUrl: string | null;
    logoSize: number | null;
  } | null = null;

  // School-scoped read: guru otomatis mengikuti sekolahnya sendiri.
  // Tahan-gagal bila migrasi logo (00005) belum diterapkan.
  try {
    const s = await getMySchool();
    if (s) {
      school = {
        name: s.name,
        logoUrl: (s.logo_url as string | null) ?? null,
        logoSize: (s.logo_size as number | null) ?? 36,
      };
    }
  } catch {
    school = null;
  }

  return (
    <AppShell
      role={role}
      roleLabel={roleLabel}
      fullName={fullName}
      avatarUrl={user.avatarUrl}
      school={school}
    >
      {children}
    </AppShell>
  );
}
