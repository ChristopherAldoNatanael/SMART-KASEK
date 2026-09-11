import Link from "next/link";
import { ArrowRight, Settings2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getMySchool } from "@/services/school.service";
import {
  SchoolLogoForm,
  SchoolProfileForm,
} from "@/components/settings/settings-forms";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pengaturan"
          description="Profil dan identitas sekolah"
        />
        <Empty
          icon={Settings2}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda terlebih dahulu."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  if (!hasRole(user.role, "principal")) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pengaturan"
          description="Profil dan identitas sekolah"
        />
        <Empty
          icon={Settings2}
          title="Akses terbatas"
          description="Hanya Kepala Sekolah yang dapat mengubah pengaturan sekolah."
        />
      </div>
    );
  }

  let school: Awaited<ReturnType<typeof getMySchool>>;
  try {
    school = await getMySchool();
  } catch {
    school = null;
  }

  if (!school) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pengaturan"
          description="Profil dan identitas sekolah"
        />
        <Empty
          icon={Settings2}
          title="Gagal memuat data sekolah"
          description="Periksa koneksi Anda lalu muat ulang halaman."
          actionHref="/settings"
          actionLabel="Muat Ulang"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pengaturan"
        title={school.name}
        description="Data satuan pendidikan, pimpinan, dan identitas visual yang tampil di sidebar."
      />

      <Panel
        title="Profil Satuan Pendidikan"
        description="Dapat diubah kapan saja — tersimpan ke data sekolah."
      >
        <SchoolProfileForm school={school} />
      </Panel>

      <Panel
        title="Logo Sekolah"
        description="Tampil di sidebar Kepala Sekolah dan seluruh guru."
      >
        <SchoolLogoForm school={school} />
      </Panel>

      <Link
        href="/settings/ai"
        className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-brand/40"
      >
        <div>
          <p className="font-semibold">Kelola AI</p>
          <p className="mt-1 text-sm text-muted-foreground">
            API key utama + cadangan (otomatis dipakai bila kuota habis).
          </p>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
          aria-hidden
        />
      </Link>
    </div>
  );
}
