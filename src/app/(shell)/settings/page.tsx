import { Settings2 } from "lucide-react";
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
    </div>
  );
}
