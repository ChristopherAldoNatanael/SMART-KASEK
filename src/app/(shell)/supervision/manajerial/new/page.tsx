import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, School, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeachers } from "@/services/teacher.service";
import ManagerialScheduleForm from "@/components/supervision/managerial-schedule-form";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function NewManagerialSupervisionPage({
  searchParams,
}: {
  searchParams?: Promise<{ teacherId?: string }>;
}) {
  const [user, teachers] = await Promise.all([
    getCurrentUser(),
    getTeachers(),
  ]);

  const canMutate = user !== null && hasRole(user.role, "principal");

  if (user?.schoolId && !canMutate) {
    redirect("/supervision/manajerial");
  }

  const requestedTeacherId = (await searchParams)?.teacherId;
  const defaultTeacherId = teachers.some((t) => t.id === requestedTeacherId)
    ? requestedTeacherId
    : undefined;

  return (
    <div className="space-y-6">
      <Link
        href="/supervision/manajerial"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Supervisi Manajerial
      </Link>

      <PageHeader
        eyebrow="Supervisi • Manajerial"
        title="Buat Supervisi Manajerial"
        description="Pilih guru dan tahun pelajaran/periode. Supervisi tersimpan sebagai draft — Instrumen 1–3 diisi di halaman detail."
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
          <ManagerialScheduleForm
            teachers={teachers.map((t) => ({
              id: t.id,
              name: t.profile?.full_name ?? "Tanpa nama",
            }))}
            defaultDate={new Date().toISOString().split("T")[0]}
            defaultTeacherId={defaultTeacherId}
            defaultAcademicYear="2026/2027"
          />
        </Panel>
      )}
    </div>
  );
}
