import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCoachingSessionById } from "@/services/coaching.service";
import {
  AddActionForm,
  SessionStatusForm,
  UpdateActionForm,
} from "@/components/coaching/session-forms";
import { Badge, PageHeader, Panel } from "@/components/common";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Terjadwal",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_TONES: Record<string, "info" | "warning" | "success" | "neutral"> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
};

const ACTION_LABELS: Record<string, string> = {
  pending: "Menunggu",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const ACTION_TONES: Record<string, "warning" | "info" | "success" | "neutral"> = {
  pending: "warning",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
};

export default async function CoachingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getCoachingSessionById(id);
  if (!session) {
    notFound();
  }

  const today = new Date().toISOString().split("T")[0];
  const date = new Date(session.session_date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const doneCount =
    session.actions?.filter((a) => a.status === "completed").length ?? 0;

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
        eyebrow={`Sesi Coaching • ${date}`}
        title={session.teacher?.profile?.full_name ?? "Tanpa nama"}
        description={`Coach: ${session.coach?.full_name ?? "—"} • Fokus: ${session.focus_area ?? "—"} • ${doneCount}/${session.actions?.length ?? 0} tindakan selesai`}
        actions={
          <Badge tone={STATUS_TONES[session.status] ?? "neutral"}>
            {STATUS_LABELS[session.status] ?? session.status}
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {session.initial_condition && (
          <Panel title="Kondisi Awal">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {session.initial_condition}
            </p>
          </Panel>
        )}
        {session.discussion && (
          <Panel title="Diskusi">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {session.discussion}
            </p>
          </Panel>
        )}
        {session.agreement && (
          <Panel title="Kesepakatan">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {session.agreement}
            </p>
          </Panel>
        )}
        {session.summary && (
          <Panel title="Ringkasan">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {session.summary}
            </p>
          </Panel>
        )}
      </div>

      {session.supervision && (
        <Panel title="Supervisi Terkait">
          <p className="text-sm text-muted-foreground">
            Berdasarkan supervisi pada{" "}
            {new Date(session.supervision.supervision_date).toLocaleDateString(
              "id-ID",
              { day: "numeric", month: "long", year: "numeric" }
            )}
          </p>
        </Panel>
      )}

      <Panel
        title="Tindak Lanjut"
        description="Menandai tindakan selesai akan memperbarui profil perkembangan guru secara otomatis"
      >
        {session.actions && session.actions.length > 0 ? (
          <ul className="divide-y">
            {session.actions.map((action) => {
              const isOverdue =
                action.status === "pending" &&
                action.target_date &&
                action.target_date < today;
              return (
                <li key={action.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{action.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target:{" "}
                        {action.target_date
                          ? new Date(action.target_date).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "—"}
                        {action.completed_date &&
                          ` • Selesai ${new Date(action.completed_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}
                        {isOverdue && (
                          <span className="ml-2 font-semibold text-rose-600">
                            Terlambat
                          </span>
                        )}
                      </p>
                      {action.evidence && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Bukti:{" "}
                          </span>
                          {action.evidence}
                        </p>
                      )}
                      {action.result && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Hasil:{" "}
                          </span>
                          {action.result}
                        </p>
                      )}
                      {action.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Catatan:{" "}
                          </span>
                          {action.notes}
                        </p>
                      )}
                    </div>
                    <Badge tone={ACTION_TONES[action.status] ?? "neutral"}>
                      {ACTION_LABELS[action.status] ?? action.status}
                    </Badge>
                  </div>
                  <UpdateActionForm action={action} sessionId={session.id} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada tindak lanjut.
          </p>
        )}

        <div className="mt-6 border-t pt-5">
          <h3 className="text-sm font-semibold">Tambah Tindak Lanjut</h3>
          <div className="mt-3">
            <AddActionForm sessionId={session.id} />
          </div>
        </div>
      </Panel>

      <Panel title="Status Sesi">
        <SessionStatusForm sessionId={session.id} current={session.status} />
      </Panel>
    </div>
  );
}
