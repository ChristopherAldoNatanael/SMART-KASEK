import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, School, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeachers } from "@/services/teacher.service";
import { getSupervisions } from "@/services/supervision.service";
import CoachingForm from "@/components/coaching/coaching-form";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function NewCoachingPage({
  searchParams,
}: {
  searchParams?: Promise<{ teacherId?: string; supervisionId?: string }>;
}) {
  const [user, teachers, supervisions] = await Promise.all([
    getCurrentUser(),
    getTeachers(),
    getSupervisions(),
  ]);

  const canMutate = user !== null && hasRole(user.role, "principal");

  // Halaman ini khusus Kepala Sekolah. Guru tidak punya alur di sini —
  // kembalikan ke daftar agar tidak mentok di halaman buntu.
  if (user?.schoolId && !canMutate) {
    redirect("/coaching");
  }

  const params = await searchParams;
  const requestedTeacherId = params?.teacherId;
  const requestedSupervisionId = params?.supervisionId;
  const defaultTeacherId = teachers.some((t) => t.id === requestedTeacherId)
    ? requestedTeacherId
    : undefined;
  const defaultSupervisionId = supervisions.some(
    (s) => s.id === requestedSupervisionId
  )
    ? requestedSupervisionId
    : undefined;

  return (
    <div className="space-y-6">
      <Link
        href="/coaching"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Coaching
      </Link>

      <PageHeader
        eyebrow="Pengembangan"
        title="Tambah Sesi Coaching"
        description="Buat sesi pendampingan beserta tindak lanjut awal untuk guru."
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
          description="Tambahkan guru terlebih dahulu — mereka dapat bergabung dengan kode undangan di dashboard."
          actionHref="/teachers"
          actionLabel="Ke Data Guru"
        />
      ) : (
        <Panel>
          <CoachingForm
            teachers={teachers.map((t) => ({
              id: t.id,
              name: t.profile?.full_name ?? "Tanpa nama",
            }))}
            defaultTeacherId={defaultTeacherId}
            defaultSupervisionId={defaultSupervisionId}
            supervisions={supervisions.map((s) => ({
              id: s.id,
              label: `${s.teacher?.profile?.full_name ?? "Guru"} — ${new Date(
                s.supervision_date
              ).toLocaleDateString("id-ID")}`,
            }))}
            defaultDate={new Date().toISOString().split("T")[0]}
          />
        </Panel>
      )}
    </div>
  );
}
