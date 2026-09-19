import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getManagerialAssessment,
  getManagerialSupervisionById,
} from "@/services/supervision-managerial.service";
import { getMySchool } from "@/services/school.service";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import {
  MANAGERIAL_I1_ITEMS,
  MANAGERIAL_I1_MAX,
  MANAGERIAL_I3_ITEMS,
  MANAGERIAL_I3_MAX,
} from "@/lib/supervision-managerial";
import { deleteSupervisionAction } from "../../actions";
import DeleteButton from "@/components/delete-button";
import AICoachDraft from "@/components/supervision/ai-coach-draft";
import AIInsightPanel from "@/components/supervision/ai-insight-panel";
import { getCachedSupervisionInsight } from "@/services/ai.service";
import ManagerialBinaryForm from "@/components/supervision/managerial-binary-form";
import ManagerialFinalizeButton from "@/components/supervision/managerial-finalize-button";
import ManagerialFollowUpForm from "@/components/supervision/managerial-followup-form";
import ManagerialProgress from "@/components/supervision/managerial-progress";
import ManagerialResult from "@/components/supervision/managerial-result";
import ManagerialScoreForm from "@/components/supervision/managerial-score-form";
import { Badge, PageHeader, Panel } from "@/components/common";

const FOLLOW_UP_LABELS: Record<string, string> = {
  none: "Belum ada tindak lanjut",
  planned: "Direncanakan",
  in_progress: "Berjalan",
  completed: "Selesai",
};

export default async function ManagerialSupervisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [supervision, user, school] = await Promise.all([
    getManagerialSupervisionById(id),
    getCurrentUser(),
    getMySchool(),
  ]);
  if (!supervision) {
    notFound();
  }
  const data = await getManagerialAssessment(id);
  const assessment = data?.assessment ?? null;
  const items = data?.items ?? [];
  const cachedInsight = await getCachedSupervisionInsight(id).catch(() => null);
  const overallFinal = assessment?.status === "final";

  const isLeader =
    user !== null && user.schoolId !== null && hasRole(user.role, "principal");

  // Guru hanya membaca hasil tersimpan yang sudah final.
  const showInsight = isLeader ? items.length > 0 : overallFinal && !!cachedInsight;
  const showCoachDraft = isLeader && items.length > 0;

  const i1Items = items.filter((i) => i.instrument === "i1");
  const i2Items = items.filter((i) => i.instrument === "i2");
  const i3Items = items.filter((i) => i.instrument === "i3");
  const i1Answered = i1Items.filter((i) => i.score != null).length;
  const i2Answered = i2Items.filter(
    (i) => i.present === true || i.present === false
  ).length;
  const i3Answered = i3Items.filter((i) => i.score != null).length;

  const allInstrumentsFinal =
    assessment?.i1_status === "final" &&
    assessment?.i2_status === "final" &&
    assessment?.i3_status === "final";

  const statusLabel = overallFinal
    ? "Final"
    : assessment
      ? "Draft"
      : "Belum Diisi";

  const date = new Date(supervision.supervision_date).toLocaleDateString(
    "id-ID",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  const teacherName = supervision.teacher?.profile?.full_name ?? "Tanpa nama";

  return (
    <div className="space-y-6">
      <Link
        href="/supervision/manajerial"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Daftar Supervisi Manajerial
      </Link>

      <PageHeader
        eyebrow={`Supervisi Manajerial • ${date}`}
        title={teacherName}
        description={`Tahun Pelajaran: ${supervision.academic_year ?? "—"} • Periode: ${supervision.period ?? "—"} • Supervisor: ${supervision.supervisor?.full_name ?? "—"}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={overallFinal ? "success" : "warning"}>
              {statusLabel}
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
                confirmText="Hapus supervisi manajerial ini beserta seluruh penilaiannya?"
              />
            )}
          </div>
        }
      />

      <ManagerialProgress
        i1Status={(assessment?.i1_status as "draft" | "final" | null) ?? null}
        i1Answered={i1Answered}
        i2Status={(assessment?.i2_status as "draft" | "final" | null) ?? null}
        i2Answered={i2Answered}
        i3Status={(assessment?.i3_status as "draft" | "final" | null) ?? null}
        i3Answered={i3Answered}
        overallFinal={overallFinal}
      />

      <div id="hasil" className="scroll-mt-4">
        <Panel
          title="Hasil Supervisi Manajerial"
          description={
            overallFinal
              ? "Nilai sudah final — rata-rata dari ketiga instrumen."
              : isLeader
                ? "Nilai sementara, dihitung otomatis. Finalisasi setelah Instrumen 1, 2, dan 3 semuanya selesai."
                : "Kepala Sekolah sedang menyusun penilaian. Hasilnya akan muncul di sini setelah selesai."
          }
          action={
            isLeader && allInstrumentsFinal && !overallFinal ? (
              <ManagerialFinalizeButton supervisionId={supervision.id} />
            ) : undefined
          }
        >
          {isLeader || overallFinal ? (
            <ManagerialResult
              teacherName={teacherName}
              subject={supervision.teacher?.subject ?? null}
              nip={supervision.teacher?.nip ?? null}
              schoolName={school?.name ?? null}
              academicYear={supervision.academic_year}
              period={supervision.period}
              supervisorName={supervision.supervisor?.full_name ?? "—"}
              statusLabel={statusLabel}
              assessment={assessment}
              items={items}
            />
          ) : (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Hasil penilaian akan muncul di sini setelah Kepala Sekolah
              selesai menilai ketiga instrumen. Silakan kembali lagi nanti.
            </p>
          )}
        </Panel>
      </div>

      <div id="instrumen-1" className="scroll-mt-4">
        <Panel
          title="Instrumen 1 — Kelengkapan Administrasi Kelas"
          description="13 pertanyaan — pilih angka 1 sampai 4 untuk tiap pertanyaan. Nilai dihitung otomatis."
        >
          {isLeader ? (
            <ManagerialScoreForm
              supervisionId={supervision.id}
              instrument="i1"
              items={MANAGERIAL_I1_ITEMS}
              max={MANAGERIAL_I1_MAX}
              initialStatus={
                (assessment?.i1_status as "draft" | "final" | null) ?? null
              }
              initialItems={Object.fromEntries(
                i1Items.map((i) => [
                  i.item_key,
                  { score: i.score, note: i.note ?? "" },
                ])
              )}
            />
          ) : (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Bagian ini diisi oleh Kepala Sekolah. Hasilnya bisa
              dilihat pada bagian Hasil di atas setelah selesai.
            </p>
          )}
        </Panel>
      </div>

      <div id="instrumen-2" className="scroll-mt-4">
        <Panel
          title="Instrumen 2 — Supervisi Perencanaan Kegiatan Pembelajaran"
          description="10 pertanyaan — jawab Ada atau Tidak untuk tiap pertanyaan. Nilai dihitung otomatis."
        >
          {isLeader ? (
            <ManagerialBinaryForm
              supervisionId={supervision.id}
              initialStatus={
                (assessment?.i2_status as "draft" | "final" | null) ?? null
              }
              initialItems={Object.fromEntries(
                i2Items.map((i) => [
                  i.item_key,
                  { present: i.present, note: i.note ?? "" },
                ])
              )}
            />
          ) : (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Bagian ini diisi oleh Kepala Sekolah. Hasilnya bisa
              dilihat pada bagian Hasil di atas setelah selesai.
            </p>
          )}
        </Panel>
      </div>

      <div id="instrumen-3" className="scroll-mt-4">
        <Panel
          title="Instrumen 3 — Penyusunan ATP/Silabus"
          description="11 pertanyaan — pilih angka 1 sampai 4 untuk tiap pertanyaan. Nilai dihitung otomatis."
        >
          {isLeader ? (
            <ManagerialScoreForm
              supervisionId={supervision.id}
              instrument="i3"
              items={MANAGERIAL_I3_ITEMS}
              max={MANAGERIAL_I3_MAX}
              initialStatus={
                (assessment?.i3_status as "draft" | "final" | null) ?? null
              }
              initialItems={Object.fromEntries(
                i3Items.map((i) => [
                  i.item_key,
                  { score: i.score, note: i.note ?? "" },
                ])
              )}
            />
          ) : (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Bagian ini diisi oleh Kepala Sekolah. Hasilnya bisa
              dilihat pada bagian Hasil di atas setelah selesai.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Catatan dan Tindak Lanjut"
        description={
          isLeader
            ? "Tulis temuan, catatan, dan rencana perbaikan untuk guru. Kalau perlu pendampingan lanjutan, tekan tombol Buat Coaching di atas."
            : "Catatan dari Kepala Sekolah dan rencana tindak lanjutnya."
        }
      >
        {isLeader ? (
          <ManagerialFollowUpForm
            supervisionId={supervision.id}
            initial={{
              findings: assessment?.findings ?? null,
              supervisorNotes: assessment?.supervisor_notes ?? null,
              followUpRecommendation:
                assessment?.follow_up_recommendation ?? null,
              improvementTarget: assessment?.improvement_target ?? null,
              followUpStatus: assessment?.follow_up_status ?? "none",
            }}
          />
        ) : (
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            {(
              [
                ["Temuan utama", assessment?.findings],
                ["Catatan supervisor", assessment?.supervisor_notes],
                ["Rekomendasi tindak lanjut", assessment?.follow_up_recommendation],
                ["Target perbaikan", assessment?.improvement_target],
              ] as [string, string | null | undefined][]
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="font-medium">{label}</dt>
                <dd className="mt-1 whitespace-pre-line text-muted-foreground">
                  {value || "—"}
                </dd>
              </div>
            ))}
            <div>
              <dt className="font-medium">Status tindak lanjut</dt>
              <dd className="mt-1">
                <Badge tone="info">
                  {FOLLOW_UP_LABELS[assessment?.follow_up_status ?? "none"] ??
                    "—"}
                </Badge>
              </dd>
            </div>
          </dl>
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
