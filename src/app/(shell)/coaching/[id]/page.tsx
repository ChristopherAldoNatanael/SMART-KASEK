import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, FileText, Link as LinkIcon, Download } from "lucide-react";
import { getCoachingSessionById } from "@/services/coaching.service";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { deleteSessionAction } from "../actions";
import DeleteButton from "@/components/delete-button";
import {
  AddActionForm,
  SessionStatusForm,
  UpdateActionForm,
} from "@/components/coaching/session-forms";
import { Badge, PageHeader, Panel } from "@/components/common";
import { getEvidenceDownloadUrl } from "@/services/coaching-evidence.service";
import { parseEvidence } from "@/lib/evidence-parser";

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

function getDeadlineStatus(
  targetDate: string | null,
  status: string
): "overdue" | "approaching" | "normal" | "completed" | "none" {
  if (status === "completed") return "completed";
  if (!targetDate) return "none";

  const today = new Date();
  const target = new Date(targetDate);
  const diffDays = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "approaching";
  return "normal";
}

function formatCountdown(targetDate: string): string {
  const today = new Date();
  const target = new Date(targetDate);
  const diffDays = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return `Terlambat ${Math.abs(diffDays)} hari`;
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Besok";
  return `${diffDays} hari lagi`;
}

async function EvidenceFileDisplay({
  filePath,
  fileName,
}: {
  filePath: string;
  fileName?: string;
}) {
  const downloadUrl = await getEvidenceDownloadUrl(filePath);
  const displayName = fileName ?? filePath.split("/").pop() ?? "File";
  const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
  const iconClass =
    ext === "pdf"
      ? "bg-red-100 text-red-600"
      : ["doc", "docx"].includes(ext)
        ? "bg-blue-100 text-blue-600"
        : ["xls", "xlsx"].includes(ext)
          ? "bg-emerald-100 text-emerald-600"
          : ["ppt", "pptx"].includes(ext)
            ? "bg-orange-100 text-orange-600"
            : ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
              ? "bg-purple-100 text-purple-600"
              : "bg-muted text-muted-foreground";

  return (
    <div className="mt-2 rounded-md border bg-muted/20 p-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">Bukti</p>
      <div className="mt-1.5 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            {ext.toUpperCase()}
          </p>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Buka
          </a>
        )}
      </div>
    </div>
  );
}

export default async function CoachingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [session, user] = await Promise.all([
    getCoachingSessionById(id),
    getCurrentUser(),
  ]);
  if (!session) {
    notFound();
  }
  const isLeader =
    user !== null && user.schoolId !== null && hasRole(user.role, "principal");
  const viewerRole = user?.role === "teacher" ? "teacher" : "principal";

  const today = new Date().toISOString().split("T")[0];
  const date = new Date(session.session_date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const doneCount =
    session.actions?.filter((a) => a.status === "completed").length ?? 0;
  const actionCount = session.actions?.length ?? 0;
  const allDone = actionCount > 0 && doneCount === actionCount;
  const overdueActions = session.actions?.filter(
    (a) => getDeadlineStatus(a.target_date, a.status) === "overdue"
  ) ?? [];
  const approachingActions = session.actions?.filter(
    (a) => getDeadlineStatus(a.target_date, a.status) === "approaching"
  ) ?? [];

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
        description={`Coach: ${session.coach?.full_name ?? "—"} • Fokus: ${session.focus_area ?? "—"} • ${doneCount}/${actionCount} tindakan selesai`}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_TONES[session.status] ?? "neutral"}>
              {STATUS_LABELS[session.status] ?? session.status}
            </Badge>
            {isLeader && (
              <DeleteButton
                action={deleteSessionAction}
                idName="sessionId"
                idValue={session.id}
                label="Hapus"
                confirmText="Hapus sesi coaching ini beserta seluruh tindak lanjutnya?"
              />
            )}
          </div>
        }
      />

      {overdueActions.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-medium text-rose-800">
              {overdueActions.length} Tindak Lanjut Terlambat
            </p>
            <p className="mt-0.5 text-sm text-rose-700">
              {viewerRole === "teacher"
                ? "Segera laporkan progres atau minta perpanjangan deadline."
                : "Hubungi guru untuk follow-up."}
            </p>
          </div>
        </div>
      )}

      {approachingActions.length > 0 && overdueActions.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Clock className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">
              {approachingActions.length} Tindak Lanjut Mendekati Deadline
            </p>
            <p className="mt-0.5 text-sm text-amber-700">
              {viewerRole === "teacher"
                ? "Pastikan selesai tepat waktu."
                : "Pantau progres guru."}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${session.status === "completed" ? "bg-emerald-100" : "bg-blue-100"}`}>
              <CheckCircle2 className={`h-5 w-5 ${session.status === "completed" ? "text-emerald-600" : "text-blue-600"}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Progress Keseluruhan</p>
              <p className="text-xs text-muted-foreground">
                {doneCount} dari {actionCount} tindak lanjut selesai
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand">
              {actionCount > 0 ? Math.round((doneCount / actionCount) * 100) : 0}%
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{
              width: `${actionCount > 0 ? (doneCount / actionCount) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

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
            <Link
              href={`/supervision/${session.supervision.id}`}
              className="font-medium text-brand hover:underline"
            >
              {new Date(
                session.supervision.supervision_date
              ).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Link>
          </p>
        </Panel>
      )}

      <Panel
        title="Tindak Lanjut"
        description={
          user?.role === "teacher"
            ? "Kerjakan tiap tindakan, lalu laporkan status + bukti. Tindakan selesai memperbarui profil perkembangan Anda."
            : "Pantau laporan guru dan verifikasi. Tindakan selesai memperbarui profil perkembangan guru secara otomatis."
        }
      >
        {session.actions && session.actions.length > 0 ? (
          <ul className="divide-y">
            {session.actions
              .sort((a, b) => {
                const statusOrder: Record<string, number> = {
                  overdue: 0,
                  approaching: 1,
                  pending: 2,
                  in_progress: 3,
                  completed: 4,
                  cancelled: 5,
                  none: 6,
                };
                const aStatus = getDeadlineStatus(a.target_date, a.status);
                const bStatus = getDeadlineStatus(b.target_date, b.status);
                if (statusOrder[aStatus] !== statusOrder[bStatus]) {
                  return statusOrder[aStatus] - statusOrder[bStatus];
                }
                if (a.target_date && b.target_date) {
                  return a.target_date.localeCompare(b.target_date);
                }
                return 0;
              })
              .map((action) => {
                const deadlineStatus = getDeadlineStatus(
                  action.target_date,
                  action.status
                );
                const isOverdue = deadlineStatus === "overdue";
                const isApproaching = deadlineStatus === "approaching";

                return (
                  <li
                    key={action.id}
                    className={`py-4 first:pt-0 last:pb-0 ${isOverdue ? "rounded-md bg-rose-50/50 px-3 -mx-3" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          {isOverdue && (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                          )}
                          {isApproaching && (
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          )}
                          <p className="font-medium leading-snug">
                            {action.action}
                          </p>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          {action.target_date && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${
                                isOverdue
                                  ? "bg-rose-100 text-rose-700"
                                  : isApproaching
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isOverdue ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : isApproaching ? (
                                <Clock className="h-3 w-3" />
                              ) : null}
                              <span className="font-medium">
                                {formatCountdown(action.target_date)}
                              </span>
                              <span className="text-muted-foreground">
                                ({new Date(action.target_date).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                  }
                                )}
                                )
                              </span>
                            </span>
                          )}
                          {action.completed_date && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Selesai{" "}
                              {new Date(action.completed_date).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                }
                              )}
                            </span>
                          )}
                        </div>
                        {action.evidence && (() => {
                          const evidence = parseEvidence(action.evidence);
                          if (!evidence) return null;

                          if (evidence.type === "text") {
                            return (
                              <div className="mt-2 rounded-md border bg-muted/20 p-2.5">
                                <p className="text-[11px] font-medium text-muted-foreground">Bukti</p>
                                <p className="mt-0.5 text-sm text-foreground">{evidence.value}</p>
                              </div>
                            );
                          }

                          if (evidence.type === "link") {
                            return (
                              <div className="mt-2 rounded-md border bg-muted/20 p-2.5">
                                <p className="text-[11px] font-medium text-muted-foreground">Bukti</p>
                                <a
                                  href={evidence.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-brand hover:underline break-all"
                                >
                                  <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                                  {evidence.value}
                                </a>
                              </div>
                            );
                          }

                          if (evidence.type === "file") {
                            return (
                              <EvidenceFileDisplay
                                filePath={evidence.value}
                                fileName={evidence.fileName}
                              />
                            );
                          }

                          return null;
                        })()}
                        {action.result && (
                          <p className="mt-1.5 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Hasil: </span>
                            {action.result}
                          </p>
                        )}
                        {action.notes && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Catatan: </span>
                            {action.notes}
                          </p>
                        )}
                      </div>
                      <Badge tone={ACTION_TONES[action.status] ?? "neutral"}>
                        {ACTION_LABELS[action.status] ?? action.status}
                      </Badge>
                    </div>
                    {action.status !== "completed" &&
                      action.status !== "cancelled" && (
                        <UpdateActionForm
                          action={action}
                          sessionId={session.id}
                          viewerRole={viewerRole}
                        />
                      )}
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada tindak lanjut.
          </p>
        )}

        {isLeader && (
          <div className="mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold">Tambah Tindak Lanjut</h3>
            <div className="mt-3">
              <AddActionForm sessionId={session.id} />
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Status Sesi">
        {isLeader ? (
          <SessionStatusForm sessionId={session.id} current={session.status} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {STATUS_LABELS[session.status] ?? session.status} — status diubah
            oleh Kepala Sekolah.
          </p>
        )}
      </Panel>
    </div>
  );
}
