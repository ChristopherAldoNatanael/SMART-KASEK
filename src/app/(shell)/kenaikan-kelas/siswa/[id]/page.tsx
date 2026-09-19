import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getPromotionDetail } from "@/services/promotion.service";
import { currentAcademicYear } from "@/lib/students";
import {
  PROMOTION_DECISION_LABELS,
  PROMOTION_RECOMMENDATION_LABELS,
  promotionStatusLabel,
} from "@/lib/promotion";
import { Badge, PageHeader, Panel } from "@/components/common";
import { RecommendationForm } from "@/components/promotion/recommendation-form";
import {
  DecisionButtons,
  ReopenButton,
  ReturnForm,
} from "@/components/promotion/decision-panel";

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "info" | "danger"> = {
  draft: "neutral",
  submitted: "info",
  returned: "warning",
  decided: "success",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PromotionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tahun?: string }>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const year = query.tahun?.trim() || currentAcademicYear();

  let detail: Awaited<ReturnType<typeof getPromotionDetail>>;
  try {
    detail = await getPromotionDetail(id, year);
  } catch {
    notFound();
  }

  const { student, decision, attendance, subjects, homeroomName, canRecommend, canDecide } =
    detail;
  const status = decision?.status ?? "draft";
  const editable = canRecommend && (!decision || status === "draft" || status === "returned");
  const showDecide = canDecide && decision?.status === "submitted";
  const showReopen = canDecide && decision?.status === "decided";

  return (
    <div className="space-y-6">
      <Link
        href="/kenaikan-kelas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Kembali
      </Link>

      <PageHeader
        eyebrow={`Kenaikan Kelas • ${student.class_name} • ${year}`}
        title={student.full_name}
        description={`NIS ${student.student_number ?? "—"} • Wali: ${homeroomName ?? "—"}`}
        actions={
          <Badge tone={STATUS_TONES[status] ?? "neutral"}>
            {promotionStatusLabel(status)}
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Kehadiran tahun berjalan">
          <div className="flex flex-wrap gap-2 text-sm font-semibold" role="status" aria-label="Rekap kehadiran">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
              Hadir {attendance.hadir}
            </span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">
              Izin {attendance.izin}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
              Sakit {attendance.sakit}
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
              Alpa {attendance.alpa}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dari data absensi harian yang tercatat. Total {attendance.total} hari.
          </p>
        </Panel>
        <Panel title="Mata pelajaran di kelas ini">
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada daftar mapel untuk kelas ini.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <Badge key={s} tone="info">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Nilai per mata pelajaran belum tersedia di sistem — rekap memakai
            data kehadiran dan catatan wali kelas.
          </p>
        </Panel>
      </div>

      <Panel
        title="Rekomendasi wali kelas"
        description={
          decision?.recommendation
            ? `Terakhir diubah ${fmtDate(decision.recommended_at)}.`
            : "Belum ada rekomendasi."
        }
      >
        {decision?.recommendation && (
          <dl className="mb-4 grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rekomendasi
              </dt>
              <dd className="mt-0.5 font-semibold">
                {PROMOTION_RECOMMENDATION_LABELS[
                  decision.recommendation as keyof typeof PROMOTION_RECOMMENDATION_LABELS
                ] ?? decision.recommendation}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Catatan wali kelas
              </dt>
              <dd className="mt-0.5 whitespace-pre-line">
                {decision.recommendation_note ?? "—"}
              </dd>
            </div>
          </dl>
        )}
        {decision?.status === "returned" && decision.principal_note && (
          <p className="mb-4 rounded-md border border-amber-600/25 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Catatan Kepala Sekolah:</strong> {decision.principal_note}
          </p>
        )}
        {editable ? (
          <RecommendationForm
            studentId={student.id}
            studentName={student.full_name}
            academicYear={year}
            initialRecommendation={
              (decision?.recommendation as "naik" | "tidak_naik" | "pertimbangan" | null) ?? null
            }
            initialNote={decision?.recommendation_note ?? null}
          />
        ) : (
          !canRecommend && (
            <p className="text-sm text-muted-foreground">
              Rekomendasi diisi oleh wali kelas.
            </p>
          )
        )}
        {canRecommend && (status === "submitted" || status === "decided") && (
          <p className="text-sm text-muted-foreground">
            {status === "submitted"
              ? "Rekomendasi sudah dikirim dan menunggu verifikasi Kepala Sekolah."
              : "Keputusan sudah ditetapkan dan terkunci."}
          </p>
        )}
      </Panel>

      {(showDecide || decision?.status === "decided" || (canDecide && decision)) && (
        <Panel
          title="Keputusan Kepala Sekolah"
          description={
            decision?.status === "decided"
              ? `Ditetapkan ${fmtDate(decision.decided_at)}. Final dan terkunci.`
              : "Tetapkan setelah memeriksa rekomendasi dan data di atas."
          }
        >
          {decision?.status === "decided" && (
            <div className="mb-4 rounded-xl border-2 border-primary/30 bg-primary/[0.04] p-4">
              <p className="tnum text-2xl font-bold">
                {decision.final_decision
                  ? (PROMOTION_DECISION_LABELS[
                      decision.final_decision as keyof typeof PROMOTION_DECISION_LABELS
                    ] ?? decision.final_decision)
                  : "—"}
              </p>
              {decision.principal_note && (
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {decision.principal_note}
                </p>
              )}
            </div>
          )}
          {showDecide && decision && (
            <div className="space-y-6">
              <DecisionButtons decisionId={decision.id} studentName={student.full_name} />
              <div className="border-t pt-4">
                <ReturnForm decisionId={decision.id} studentName={student.full_name} />
              </div>
            </div>
          )}
          {showReopen && decision && (
            <ReopenButton decisionId={decision.id} studentName={student.full_name} />
          )}
          {canDecide && !decision && (
            <p className="text-sm text-muted-foreground">
              Wali kelas belum membuat rekomendasi untuk siswa ini.
            </p>
          )}
        </Panel>
      )}

      {canRecommend && (
        <p className="text-xs text-muted-foreground">
          Setelah semua siswa direkomendasikan, kirim sekaligus dari halaman
          Kelas Saya agar Kepala Sekolah bisa memverifikasi.
        </p>
      )}
    </div>
  );
}
