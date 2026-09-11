import Link from "next/link";
import { ArrowLeft, School, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOwnTeacherId, getTeachers } from "@/services/teacher.service";
import LessonForm from "@/components/learning/lesson-form";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function NewLessonPage() {
  const [user, teachers] = await Promise.all([
    getCurrentUser(),
    getTeachers(),
  ]);

  const isPrincipal = user?.role === "principal" || user?.role === "admin";
  const ownTeacherId =
    user && !isPrincipal && user.schoolId
      ? await getOwnTeacherId(user.id, user.schoolId).catch(() => null)
      : null;

  return (
    <div className="space-y-6">
      <Link
        href="/learning"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Modul Ajar
      </Link>

      <PageHeader
        eyebrow="Pembelajaran"
        title="Tambah Modul Ajar"
        description={
          isPrincipal
            ? "Catat modul ajar untuk guru di sekolah Anda."
            : "Susun modul ajar Anda — Kepala Sekolah dapat memantaunya."
        }
      />

      {!user?.schoolId ? (
        <Empty
          icon={School}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda terlebih dahulu."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      ) : isPrincipal && teachers.length === 0 ? (
        <Empty
          icon={Users}
          title="Belum ada data guru"
          description="Guru dapat bergabung dengan kode undangan di dashboard Anda."
        />
      ) : (
        <Panel>
          <LessonForm
            teachers={teachers.map((t) => ({
              id: t.id,
              name: t.profile?.full_name ?? "Tanpa nama",
            }))}
            isPrincipal={isPrincipal}
            schoolId={user.schoolId}
            ownTeacherId={ownTeacherId}
          />
        </Panel>
      )}
    </div>
  );
}
