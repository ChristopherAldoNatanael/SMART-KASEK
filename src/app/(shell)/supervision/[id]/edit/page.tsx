import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, School, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeachers } from "@/services/teacher.service";
import { getSupervisionById } from "@/services/supervision.service";
import SupervisionScheduleEditForm from "@/components/supervision/supervision-schedule-edit-form";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function EditSupervisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, supervision, teachers] = await Promise.all([
    getCurrentUser(),
    getSupervisionById(id),
    getTeachers(),
  ]);

  // Halaman khusus Kepala Sekolah (ubah jadwal). Guru tidak punya
  // alur di sini — kembalikan ke detail agar tidak mentok.
  if (user?.schoolId && !hasRole(user.role, "principal")) {
    redirect(`/supervision/${id}`);
  }

  if (!supervision) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/supervision/${supervision.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Kembali ke Detail Supervisi
      </Link>

      <PageHeader
        eyebrow="Pembelajaran"
        title="Ubah Jadwal Supervisi"
        description={`Ubah guru, tanggal, tahun pelajaran, atau tipe untuk supervisi ${supervision.teacher?.profile?.full_name ?? "ini"}. Dokumen dan penilaian tidak ikut berubah.`}
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
          description="Guru dapat bergabung dengan kode undangan di dashboard."
          actionHref="/teachers"
          actionLabel="Ke Data Guru"
        />
      ) : (
        <Panel>
          <SupervisionScheduleEditForm
            supervisionId={supervision.id}
            teachers={teachers.map((t) => ({
              id: t.id,
              name: t.profile?.full_name ?? "Tanpa nama",
            }))}
            initial={{
              teacherId: supervision.teacher_id,
              supervisionDate: supervision.supervision_date.slice(0, 10),
              type: supervision.type,
              academicYear: supervision.academic_year,
            }}
          />
        </Panel>
      )}
    </div>
  );
}
