import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, School, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeachers } from "@/services/teacher.service";
import TrainingForm from "@/components/growth/training-form";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function NewTrainingPage() {
  const [user, teachers] = await Promise.all([
    getCurrentUser(),
    getTeachers(),
  ]);

  const canMutate = user !== null && hasRole(user.role, "principal");

  // Halaman ini khusus Kepala Sekolah — guru kembali ke rekap.
  if (user?.schoolId && !canMutate) {
    redirect("/growth");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/growth"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Teacher Growth
      </Link>

      <PageHeader
        eyebrow="Pengembangan"
        title="Tambah Pelatihan"
        description="Isi data kegiatan sekali — pilih guru peserta, dan rekap Teacher Growth terisi otomatis."
      />

      {!user?.schoolId ? (
        <Empty
          icon={School}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda terlebih dahulu."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      ) : teachers.length === 0 ? (
        <Empty
          icon={Users}
          title="Belum ada data guru"
          description="Tambahkan guru terlebih dahulu sebelum mencatat pelatihan."
          actionHref="/teachers"
          actionLabel="Ke Data Guru"
        />
      ) : (
        <Panel>
          <TrainingForm
            teachers={teachers.map((t) => ({
              id: t.id,
              name: t.profile?.full_name ?? "Tanpa nama",
            }))}
          />
        </Panel>
      )}
    </div>
  );
}
