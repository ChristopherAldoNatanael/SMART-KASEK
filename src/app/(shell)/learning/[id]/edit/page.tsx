import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLessonPlanById } from "@/services/lesson.service";
import LessonEditForm from "@/components/learning/lesson-edit-form";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ubah Modul Ajar" />
        <Empty
          icon={BookOpenText}
          title="Belum terhubung ke sekolah"
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  const plan = await getLessonPlanById(id).catch(() => null);
  if (!plan) {
    notFound();
  }

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
        title="Ubah Modul Ajar"
        description={`Pemilik: ${plan.teacherName ?? "—"} — termasuk mengganti status ke Dipublikasikan agar terlihat Kepala Sekolah.`}
      />

      <Panel>
        <LessonEditForm plan={plan} schoolId={user.schoolId} />
      </Panel>
    </div>
  );
}
