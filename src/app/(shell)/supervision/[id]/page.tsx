import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSupervisionById } from "@/services/supervision.service";
import { getSupervisionDocuments } from "@/services/supervision-documents.service";
import { getInstrumentAssessment } from "@/services/instrument-assessment.service";
import { INSTRUMENT_ASPECTS } from "@/lib/supervision-instrument";
import type { SupervisionDocType } from "@/lib/supervision-docs";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { deleteSupervisionAction } from "../actions";
import DeleteButton from "@/components/delete-button";
import AICoachDraft from "@/components/supervision/ai-coach-draft";
import AIInsightPanel from "@/components/supervision/ai-insight-panel";
import SupervisionStatusForm from "@/components/supervision/supervision-status-form";
import { getCachedSupervisionInsight } from "@/services/ai.service";
import SupervisionDocuments from "@/components/supervision/supervision-documents";
import SupervisionInstrumentForm from "@/components/supervision/supervision-instrument-form";
import SupervisionInstrumentResult from "@/components/supervision/supervision-instrument-result";
import { SyncCompetenciesButton } from "@/components/supervision/sync-competencies-button";
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
  const instrument = await getInstrumentAssessment(id);
  const cachedInsight = await getCachedSupervisionInsight(id).catch(() => null);
  const hasResults = !!instrument && instrument.items.length > 0;
  const isFinal = instrument?.assessment.status === "final";
  const isLeader =
    user !== null && user.schoolId !== null && hasRole(user.role, "principal");
  // Guru hanya membaca hasil tersimpan yang sudah final.
  const showInsight = isLeader ? hasResults : isFinal && !!cachedInsight;
  const showCoachDraft = isLeader && hasResults;
  // Guru mengunggah dokumen supervisinya sendiri; kepala sekolah menilai.
  // Teacher hanya mencapai halaman ini untuk supervisi miliknya
  // (service memfilter ke teacher_id sendiri), jadi boleh upload.
  const canUploadDocs =
    user !== null &&
    user.schoolId !== null &&
    (isLeader || user.role === "teacher");
  const viewerRole =
    user?.role === "teacher" ? "teacher" : isLeader ? user?.role ?? "principal" : "principal";
  const coveredTypes = new Set(documents.map((d) => d.doc_type)).size;
  const docsComplete = coveredTypes >= 12;
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
        description={`Tipe: ${supervision.type ?? "—"} • Tahun Pelajaran: ${supervision.academic_year ?? "—"} • Supervisor: ${supervision.supervisor?.full_name ?? "—"}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={STATUS_TONES[supervision.status] ?? "neutral"}>
              {STATUS_LABELS[supervision.status] ?? supervision.status}
            </Badge>
            {isLeader && (
              <Link
                href={`/supervision/${supervision.id}/edit`}
                className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Ubah Jadwal
              </Link>
            )}
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
                confirmText="Hapus supervisi ini beserta dokumen dan penilaiannya?"
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
              Guru mengunggah dokumen ({coveredTypes}/12 jenis
              {documents.length !== coveredTypes
                ? ` • ${documents.length} berkas`
                : ""}
              )
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
        <Panel title="Nilai Instrumen">
          <p className="tnum text-4xl font-bold tracking-tight">
            {supervision.overall_score ?? "—"}
          </p>
        </Panel>
        <Panel title="Aspek Dinilai">
          <p className="tnum text-4xl font-bold tracking-tight">
            {instrument
              ? `${instrument.items.filter((i) => i.score != null).length}/12`
              : "—"}
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
            ? "Unggah 12 perangkat Anda di sini (CP s.d. Jadwal Pelajaran). Tiap jenis boleh lebih dari 1 berkas. Format utama Word (.docx), PDF didukung."
            : "Dokumen yang diunggah guru (CP s.d. Jadwal Pelajaran). Tiap jenis dapat berisi lebih dari 1 berkas. Periksa sebelum menilai. Format utama Word (.docx), PDF didukung."
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
        title="Penilaian Instrumen 12 Aspek"
        description="Ada/Tidak + skor 1–4 per aspek. Nilai = (jumlah skor/48) × 100."
        action={
          isLeader && instrument?.assessment.status === "final" ? (
            <SyncCompetenciesButton supervisionId={supervision.id} />
          ) : undefined
        }
      >
        {isLeader && instrument?.assessment.status === "final" && (
          <p className="mb-4 rounded-md border border-sky-600/20 bg-sky-50 p-3 text-sm text-sky-800">
            Penilaian final otomatis terkirim ke profil guru saat
            diselesaikan. Gunakan tombol “Kirim ke Profil Guru” untuk
            mengirim ulang — mis. supervisi ini diselesaikan sebelum fitur
            otomatis ada, atau pengiriman sebelumnya gagal.
          </p>
        )}
        {isLeader ? (
          <div className="space-y-6">
            {instrument && instrument.assessment.status === "final" && (
              <SupervisionInstrumentResult
                teacherName={supervision.teacher?.profile?.full_name ?? "Tanpa nama"}
                className={instrument.assessment.class_name ?? instrument.teacherClass}
                dateLabel={date}
                totalScore={instrument.assessment.total_score}
                finalValue={instrument.assessment.final_value}
                grade={instrument.assessment.grade}
                status={instrument.assessment.status}
                evaluation={instrument.assessment.evaluation}
                items={INSTRUMENT_ASPECTS.map((a) => {
                  const found = instrument.items.find(
                    (i) => i.doc_type === a.docType
                  );
                  return {
                    docType: a.docType as SupervisionDocType,
                    label: a.label,
                    present: found?.present ?? false,
                    score: found?.score ?? null,
                    note: found?.note ?? null,
                  };
                })}
              />
            )}
            <SupervisionInstrumentForm
              supervisionId={supervision.id}
              teacherName={supervision.teacher?.profile?.full_name ?? "Tanpa nama"}
              dateLabel={date}
              teacherClassFallback={instrument?.teacherClass ?? null}
              initialStatus={
                instrument
                  ? (instrument.assessment.status as "draft" | "final")
                  : null
              }
              initialClassName={instrument?.assessment.class_name ?? null}
              initialEvaluation={instrument?.assessment.evaluation ?? null}
              initialItems={Object.fromEntries(
                (instrument?.items ?? []).map((i) => [
                  i.doc_type,
                  {
                    present: i.present,
                    score: i.score,
                    note: i.note ?? "",
                  },
                ])
              )}
              docs={documents.map((d) => ({
                doc_type: d.doc_type,
                original_name: d.original_name,
                downloadUrl: d.downloadUrl,
                mime_type: d.mime_type,
              }))}
            />
          </div>
        ) : instrument && instrument.assessment.status === "final" ? (
          <SupervisionInstrumentResult
            teacherName={supervision.teacher?.profile?.full_name ?? "Tanpa nama"}
            className={instrument.assessment.class_name ?? instrument.teacherClass}
            dateLabel={date}
            totalScore={instrument.assessment.total_score}
            finalValue={instrument.assessment.final_value}
            grade={instrument.assessment.grade}
            status={instrument.assessment.status}
            evaluation={instrument.assessment.evaluation}
            items={INSTRUMENT_ASPECTS.map((a) => {
              const found = instrument.items.find(
                (i) => i.doc_type === a.docType
              );
              return {
                docType: a.docType as SupervisionDocType,
                label: a.label,
                present: found?.present ?? false,
                score: found?.score ?? null,
                note: found?.note ?? null,
              };
            })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {instrument
              ? "Kepala Sekolah sedang menyusun penilaian instrumen."
              : "Belum ada penilaian instrumen. Penilaian dilakukan Kepala Sekolah setelah dokumen lengkap."}
          </p>
        )}
      </Panel>

      {showInsight && (
        <Panel
          title="AI Insight Supervisi"
          description="Ringkasan otomatis dari hasil penilaian di atas. Nilai tidak diubah."
        >
          <AIInsightPanel
            supervisionId={supervision.id}
            initial={
              cachedInsight ? { cached: true, insight: cachedInsight } : null
            }
            canGenerate={isLeader}
          />
        </Panel>
      )}

      {showCoachDraft && (
        <Panel
          title="AI Coach Guru"
          description="Susun draf rencana coaching dari temuan supervisi, periksa dulu, lalu simpan ke Coaching."
        >
          <AICoachDraft
            supervisionId={supervision.id}
            teacherId={supervision.teacher_id}
            teacherName={supervision.teacher?.profile?.full_name ?? "Tanpa nama"}
          />
        </Panel>
      )}
    </div>
  );
}
