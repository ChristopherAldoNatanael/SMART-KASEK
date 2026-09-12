import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSupervisionById } from "@/services/supervision.service";
import { getSupervisionDocuments } from "@/services/supervision-documents.service";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { deleteSupervisionAction } from "../actions";
import DeleteButton from "@/components/delete-button";
import SupervisionStatusForm from "@/components/supervision/supervision-status-form";
import SupervisionAssessmentForm, {
  SupervisionItemDeleteButton,
} from "@/components/supervision/supervision-assessment-form";
import SupervisionDocuments from "@/components/supervision/supervision-documents";
import { Badge, PageHeader, Panel } from "@/components/common";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  completed: "Selesai",
  follow_up: "Tindak Lanjut",
  closed: "Ditutup",
};

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "info"> = {
  draft: "neutral",
  completed: "success",
  follow_up: "warning",
  closed: "info",
};

export default async function SupervisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [supervision, user] = await Promise.all([
    getSupervisionById(id),
    getCurrentUser(),
  ]);
  if (!supervision) {
    notFound();
  }
  const documents = await getSupervisionDocuments(id);
  const isLeader =
    user !== null && user.schoolId !== null && hasRole(user.role, "principal");
  // Guru mengunggah dokumen supervisinya sendiri; kepala sekolah menilai.
  // Teacher hanya mencapai halaman ini untuk supervisi miliknya
  // (service memfilter ke teacher_id sendiri), jadi boleh upload.
  const canUploadDocs =
    user !== null &&
    user.schoolId !== null &&
    (isLeader || user.role === "teacher");
  const viewerRole =
    user?.role === "teacher" ? "teacher" : isLeader ? user?.role ?? "principal" : "principal";
  const docsComplete = documents.length >= 12;
  const supervised =
    supervision.status === "completed" ||
    supervision.status === "follow_up" ||
    supervision.status === "closed";

  const date = new Date(supervision.supervision_date).toLocaleDateString(
    "id-ID",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-6">
      <Link
        href="/supervision"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Supervisi
      </Link>

      <PageHeader
        eyebrow={`Supervisi • ${date}`}
        title={supervision.teacher?.profile?.full_name ?? "Tanpa nama"}
        description={`Tipe: ${supervision.type ?? "—"} • Supervisor: ${supervision.supervisor?.full_name ?? "—"}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_TONES[supervision.status] ?? "neutral"}>
              {STATUS_LABELS[supervision.status] ?? supervision.status}
            </Badge>
            {isLeader && (
              <Link
                href={`/coaching/new?teacherId=${supervision.teacher_id}&supervisionId=${supervision.id}`}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Buat Coaching
              </Link>
            )}
            {isLeader && (
              <DeleteButton
                action={deleteSupervisionAction}
                idName="supervisionId"
                idValue={supervision.id}
                label="Hapus"
                confirmText="Hapus supervisi ini beserta seluruh indikatornya?"
              />
            )}
          </div>
        }
      />

      <ol className="grid gap-3 rounded-xl border bg-card p-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:grid-cols-3">
        <li className="flex items-start gap-2.5">
          <Badge tone={docsComplete ? "success" : "info"}>1</Badge>
          <div>
            <p className="font-semibold">
              Guru mengunggah dokumen ({documents.length}/12)
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {docsComplete
                ? "Lengkap — siap dinilai Kepala Sekolah."
                : user?.role === "teacher"
                  ? "Lengkapi 12 perangkat di bawah ini."
                  : "Menunggu guru melengkapi dokumen."}
            </p>
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <Badge tone={supervised ? "success" : "neutral"}>2</Badge>
          <div>
            <p className="font-semibold">Kepala Sekolah menilai</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {supervised
                ? "Penilaian selesai."
                : user?.role === "teacher"
                  ? "Menunggu penilaian setelah dokumen lengkap."
                  : "Isi indikator 0–100 lalu selesaikan status."}
            </p>
          </div>
        </li>
        <li className="flex items-start gap-2.5">
          <Badge
            tone={
              supervision.status === "closed"
                ? "success"
                : supervision.status === "follow_up"
                  ? "warning"
                  : "neutral"
            }
          >
            3
          </Badge>
          <div>
            <p className="font-semibold">Coaching & tindak lanjut</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {supervision.status === "closed"
                ? "Selesai."
                : supervision.status === "follow_up"
                  ? "Berjalan — pantau di halaman Coaching."
                  : "Dibuat Kepala Sekolah setelah penilaian."}
            </p>
          </div>
        </li>
      </ol>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Skor Keseluruhan">
          <p className="tnum text-4xl font-bold tracking-tight">
            {supervision.overall_score ?? "—"}
          </p>
        </Panel>
        <Panel title="Indikator Dinilai">
          <p className="tnum text-4xl font-bold tracking-tight">
            {supervision.items?.length ?? 0}
          </p>
        </Panel>
        <Panel title="Status">
          {isLeader ? (
            <SupervisionStatusForm
              supervisionId={supervision.id}
              current={supervision.status}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {STATUS_LABELS[supervision.status] ?? supervision.status} — status
              diubah oleh Kepala Sekolah.
            </p>
          )}
        </Panel>
      </div>

      {(supervision.summary || supervision.strengths || supervision.improvements) && (
        <div className="grid gap-4 md:grid-cols-3">
          {supervision.summary && (
            <Panel title="Ringkasan">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {supervision.summary}
              </p>
            </Panel>
          )}
          {supervision.strengths && (
            <Panel title="Kekuatan">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {supervision.strengths}
              </p>
            </Panel>
          )}
          {supervision.improvements && (
            <Panel title="Perlu Ditingkatkan">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {supervision.improvements}
              </p>
            </Panel>
          )}
        </div>
      )}

      <Panel
        title="Dokumen Perangkat Pembelajaran"
        description={
          user?.role === "teacher"
            ? "Unggah 12 perangkat Anda di sini (CP s.d. Jadwal Pelajaran). Format utama Word (.docx), PDF didukung."
            : "Dokumen yang diunggah guru (CP s.d. Jadwal Pelajaran). Periksa sebelum menilai. Format utama Word (.docx), PDF didukung."
        }
      >
        {user?.schoolId ? (
          <SupervisionDocuments
            supervisionId={supervision.id}
            schoolId={user.schoolId}
            canUpload={canUploadDocs}
            viewerRole={viewerRole}
            initialDocs={documents}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Akun Anda belum terhubung ke sekolah.
          </p>
        )}
      </Panel>

      <Panel
        title="Indikator Supervisi"
        description="Setiap indikator dinilai 0–100 beserta observasi dan rekomendasi"
      >
        {supervision.items && supervision.items.length > 0 ? (
          <ul className="divide-y">
            {supervision.items.map((item, index) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      #{index + 1}
                      {item.category ? ` • ${item.category}` : ""}
                    </p>
                    <p className="mt-1 font-medium leading-snug">
                      {item.indicator}
                    </p>
                    {item.observation && (
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Observasi:{" "}
                        </span>
                        {item.observation}
                      </p>
                    )}
                    {item.recommendation && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Rekomendasi:{" "}
                          </span>
                          {item.recommendation}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="tnum text-xl font-bold">
                        {item.score ?? "—"}
                      </span>
                      {isLeader && (
                        <SupervisionItemDeleteButton
                          itemId={item.id}
                          supervisionId={supervision.id}
                          label={item.indicator}
                        />
                      )}
                    </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada indikator supervisi.
          </p>
        )}
      </Panel>

      {isLeader && (
        <Panel
          title="Tambah Penilaian"
          description="Isi setelah dokumen guru lengkap. Skor keseluruhan dihitung ulang otomatis dari rata-rata seluruh indikator."
        >
          <SupervisionAssessmentForm
            supervisionId={supervision.id}
            initialSummary={supervision.summary}
            initialStrengths={supervision.strengths}
            initialImprovements={supervision.improvements}
            docsComplete={docsComplete}
            docsCount={documents.length}
          />
        </Panel>
      )}
    </div>
  );
}
