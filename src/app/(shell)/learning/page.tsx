import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLessonPlans, getLessonSubmissionStats } from "@/services/lesson.service";
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

/** Ubah URL YouTube apa pun menjadi URL embed. Null bila bukan YouTube. */
function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return url;
      return null;
    }
    if (host === "youtu.be") {
      const id = u.pathname.split("/")[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

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
  let submission = { teacherCount: 0, submittedCount: 0, percent: 0 };
  let loadError: string | null = null;
  try {
    [plans, submission] = await Promise.all([
      getLessonPlans(),
      getLessonSubmissionStats(),
    ]);
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

      {!loadError && submission.teacherCount > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              Pengumpulan Modul Ajar
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="tnum text-lg font-bold text-foreground">
                {submission.percent}%
              </span>{" "}
              ({submission.submittedCount} dari {submission.teacherCount} guru
              sudah mengumpulkan)
            </p>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${submission.percent} persen guru sudah mengumpulkan modul ajar`}
          >
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${submission.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dihitung dari modul berstatus Dipublikasikan.
          </p>
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
              {plan.doc_url &&
                (() => {
                  const embed = youtubeEmbed(plan.doc_url as string);
                  return embed ? (
                    <div className="mt-3 overflow-hidden rounded-lg border">
                      <iframe
                        src={embed}
                        title={`Video ${plan.title}`}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ) : null;
                })()}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-sm">
                {plan.semester && (
                  <span className="text-xs text-muted-foreground">
                    Semester {plan.semester}
                  </span>
                )}
                <Link
                  href={`/learning/${plan.id}/edit`}
                  className="font-medium text-brand hover:underline"
                >
                  Ubah
                </Link>
                {plan.downloadUrl && (
                  <a
                    href={plan.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    {plan.fileName ? `Unduh ${plan.fileName}` : "Buka Dokumen"}
                  </a>
                )}
                {plan.doc_url && !youtubeEmbed(plan.doc_url) && (
                  <a
                    href={plan.doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    Buka Tautan
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
