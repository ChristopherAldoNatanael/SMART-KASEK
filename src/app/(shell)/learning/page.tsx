import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLessonPlans } from "@/services/lesson.service";
import LessonDeleteButton from "@/components/learning/lesson-delete-button";
import { Badge, Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

const STATUS_TONES: Record<string, "neutral" | "success" | "info"> = {
  draft: "neutral",
  published: "success",
  archived: "info",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Dipublikasikan",
  archived: "Diarsipkan",
};

export default async function LearningPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Modul Ajar"
          description="Perangkat pembelajaran yang disusun guru"
        />
        <Empty
          icon={BookOpenText}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda terlebih dahulu."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  const isPrincipal = user.role === "principal" || user.role === "admin";

  let plans: Awaited<ReturnType<typeof getLessonPlans>> = [];
  let loadError: string | null = null;
  try {
    plans = await getLessonPlans();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Gagal memuat modul ajar";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pembelajaran"
        title="Modul Ajar"
        description={
          isPrincipal
            ? `${plans.length} modul dari guru di sekolah Anda — otomatis terintegrasi saat guru menginput.`
            : "Modul yang Anda susun — otomatis terlihat oleh Kepala Sekolah."
        }
        actions={
          <Link
            href="/learning/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Modul
          </Link>
        }
      />

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {!loadError && plans.length === 0 && (
        <Empty
          icon={BookOpenText}
          title="Belum ada modul ajar"
          description={
            isPrincipal
              ? "Modul yang diinput guru akan otomatis tampil di sini."
              : "Buat modul ajar pertama Anda — Kepala Sekolah dapat memantaunya di sini."
          }
          actionHref="/learning/new"
          actionLabel="Tambah Modul"
        />
      )}

      {!loadError && plans.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Panel
              key={plan.id}
              title={plan.title}
              description={
                [plan.teacherName, plan.subject, plan.class_name]
                  .filter(Boolean)
                  .join(" • ") || undefined
              }
              action={
                <Badge tone={STATUS_TONES[plan.status] ?? "neutral"}>
                  {STATUS_LABELS[plan.status] ?? plan.status}
                </Badge>
              }
            >
              {plan.description && (
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 border-t pt-3 text-sm">
                {plan.semester && (
                  <span className="text-xs text-muted-foreground">
                    Semester {plan.semester}
                  </span>
                )}
                {plan.file_url && (
                  <a
                    href={plan.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    Buka Dokumen
                  </a>
                )}
                {isPrincipal && (
                  <span className="ml-auto">
                    <LessonDeleteButton lessonId={plan.id} />
                  </span>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
