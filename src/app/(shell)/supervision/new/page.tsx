import Link from "next/link";
import { ArrowLeft, School, ShieldAlert, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeachers } from "@/services/teacher.service";
import SupervisionForm from "@/components/supervision/supervision-form";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function NewSupervisionPage() {
  const [user, teachers] = await Promise.all([
    getCurrentUser(),
    getTeachers(),
  ]);

  const canMutate = user !== null && hasRole(user.role, "principal");

  return (
    <div className="space-y-6">
      <Link
        href="/supervision"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Supervisi
      </Link>

      <PageHeader
        eyebrow="Pembelajaran"
        title="Tambah Supervisi"
        description="Catat hasil observasi beserta indikator penilaian 0–100."
      />

      {!user?.schoolId ? (
        <Empty
          icon={School}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda terlebih dahulu."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      ) : !canMutate ? (
        <Empty
          icon={ShieldAlert}
          title="Akses terbatas"
          description="Hanya Kepala Sekolah yang dapat membuat supervisi."
        />
      ) : teachers.length === 0 ? (
        <Empty
          icon={Users}
          title="Belum ada data guru"
          description="Guru dapat bergabung dengan kode undangan di dashboard."
          actionHref="/teachers"
          actionLabel="Ke Data Guru"
        />
      ) : (
        <Panel>
          <SupervisionForm
            teachers={teachers.map((t) => ({
              id: t.id,
              name: t.profile?.full_name ?? "Tanpa nama",
            }))}
            defaultDate={new Date().toISOString().split("T")[0]}
          />
        </Panel>
      )}
    </div>
  );
}
