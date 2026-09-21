import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeachers } from "@/services/teacher.service";
import { getTrainingById } from "@/services/training.service";
import TrainingForm from "@/components/growth/training-form";
import { PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const canMutate = user !== null && hasRole(user.role, "principal");
  if (user?.schoolId && !canMutate) {
    redirect("/growth");
  }

  const [teachers, training] = await Promise.all([
    getTeachers().catch(() => []),
    getTrainingById(id).catch(() => null),
  ]);

  if (!training) {
    notFound();
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
        title="Ubah Pelatihan"
        description="Perbarui data kegiatan, poin, atau daftar guru peserta."
      />

      <Panel>
        <TrainingForm
          teachers={teachers.map((t) => ({
            id: t.id,
            name: t.profile?.full_name ?? "Tanpa nama",
          }))}
          initial={{
            id: training.id,
            name: training.name,
            description: training.description,
            organizer: training.organizer,
            trainingDate: training.training_date,
            scheduleTime: training.schedule_time,
            location: training.location,
            durationHours: training.duration_hours,
            points: training.points ?? 0,
            participantIds: training.participants.map((p) => p.teacher_id),
          }}
        />
      </Panel>
    </div>
  );
}
