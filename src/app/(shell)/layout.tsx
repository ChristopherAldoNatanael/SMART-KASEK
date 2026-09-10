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
  let role: string | null = null;
  let roleLabel = "-";
  let fullName = "SMART KASEK";
  let school: {
    name: string;
    logoUrl: string | null;
    logoSize: number | null;
  } | null = null;

  try {
    const user = await getCurrentUser();
    role = user?.role ?? null;
    fullName = user?.fullName ?? "SMART KASEK";
    roleLabel =
      user?.role === "principal"
        ? "Kepala Sekolah"
        : user?.role === "teacher"
          ? "Guru"
          : (user?.role ?? "-");

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
  } catch {
    // Ignore — render shell chrome with placeholders.
  }

  return (
    <AppShell
      role={role}
      roleLabel={roleLabel}
      fullName={fullName}
      school={school}
    >
      {children}
    </AppShell>
  );
}
