"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnTeacherId } from "./teacher.service";
import {
  calcInstrumentValue,
  gradeForValue,
  isValidInstrumentScore,
  INSTRUMENT_ASPECTS,
  totalInstrumentScore,
  type InstrumentItemInput,
  type InstrumentStatus,
} from "@/lib/supervision-instrument";
import { SUPERVISION_DOC_TYPES } from "@/lib/supervision-docs";
import type { Database } from "@/types/database";

type InstrumentAssessment =
  Database["public"]["Tables"]["supervision_instrument_assessments"]["Row"];
type InstrumentItem =
  Database["public"]["Tables"]["supervision_instrument_items"]["Row"];

export type InstrumentAssessmentWithItems = {
  assessment: InstrumentAssessment;
  items: InstrumentItem[];
  /** Kelas wali guru (fallback header bila snapshot kosong). */
  teacherClass: string | null;
};

/**
 * Scope: supervisi milik sekolah user; guru hanya miliknya sendiri.
 * Mengembalikan schoolId + teacherClass (homeroom, nullable).
 */
async function resolveScope(supervisionId: string): Promise<{
  schoolId: string;
  teacherClass: string | null;
} | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("supervisions")
    .select("id, teacher_id, teacher:teachers(homeroom_class)")
    .eq("id", supervisionId)
    .eq("school_id", user.schoolId)
    .single();
  if (!data) return null;
  if (user.role === "teacher") {
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
    if (!ownId || ownId !== data.teacher_id) return null;
  }
  const teacher = data.teacher as unknown as {
    homeroom_class: string | null;
  } | null;
  return { schoolId: user.schoolId, teacherClass: teacher?.homeroom_class ?? null };
}

async function assertLeader(): Promise<{ schoolId: string; evaluatorId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat menilai");
  }
  return { schoolId: user.schoolId, evaluatorId: user.id };
}

function sanitizeItems(items: InstrumentItemInput[]): InstrumentItemInput[] {
  const seen = new Set<string>();
  const clean: InstrumentItemInput[] = [];
  for (const item of items) {
    if (!SUPERVISION_DOC_TYPES.includes(item.docType)) continue;
    if (seen.has(item.docType)) continue;
    seen.add(item.docType);
    clean.push({
      docType: item.docType,
      present: !!item.present,
      score: isValidInstrumentScore(item.score) ? item.score : null,
      note: item.note?.trim().slice(0, 2000) || undefined,
    });
  }
  return clean;
}

/**
 * Ambil penilaian instrumen + item + kelas guru.
 * Null bila belum ada atau di luar hak akses (tanpa membocorkan data).
 */
export async function getInstrumentAssessment(
  supervisionId: string
): Promise<InstrumentAssessmentWithItems | null> {
  const scope = await resolveScope(supervisionId);
  if (!scope) return null;
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("supervision_instrument_assessments")
    .select("*")
    .eq("supervision_id", supervisionId)
    .maybeSingle();
  if (!assessment) return null;
  const { data: items, error } = await supabase
    .from("supervision_instrument_items")
    .select("*")
    .eq("assessment_id", assessment.id);
  if (error) throw new Error(error.message);
  return {
    assessment: assessment as InstrumentAssessment,
    items: (items ?? []) as InstrumentItem[],
    teacherClass: scope.teacherClass,
  };
}

/**
 * Simpan draft (parsial OK). Selalu berstatus draft — menyimpan ulang
 * penilaian final akan mengembalikannya ke draft (eksplisit, tercatat audit).
 */
export async function saveInstrumentDraft(input: {
  supervisionId: string;
  className?: string;
  evaluation?: string;
  items: InstrumentItemInput[];
}): Promise<InstrumentAssessment> {
  const { evaluatorId } = await assertLeader();
  const scope = await resolveScope(input.supervisionId);
  if (!scope) throw new Error("Supervisi tidak ditemukan");

  const supabase = await createClient();
  const items = sanitizeItems(input.items);
  const total = totalInstrumentScore(items);

  const { data: existing } = await supabase
    .from("supervision_instrument_assessments")
    .select("id, status")
    .eq("supervision_id", input.supervisionId)
    .maybeSingle();

  let assessmentId: string;
  const header = {
    supervision_id: input.supervisionId,
    class_name: input.className?.trim().slice(0, 50) || null,
    evaluator_id: evaluatorId,
    total_score: total,
    final_value: calcInstrumentValue(total),
    grade: gradeForValue(calcInstrumentValue(total)),
    evaluation: input.evaluation?.trim() || null,
    status: "draft" as InstrumentStatus,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("supervision_instrument_assessments")
      .update(header)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    assessmentId = data.id;
  } else {
    const { data, error } = await supabase
      .from("supervision_instrument_assessments")
      .insert(header)
      .select()
      .single();
    if (error) throw new Error(error.message);
    assessmentId = data.id;
  }

  // Upsert per aspek (1 baris per doc_type).
  for (const item of items) {
    const { error } = await supabase
      .from("supervision_instrument_items")
      .upsert(
        {
          assessment_id: assessmentId,
          doc_type: item.docType,
          present: item.present,
          score: item.score,
          note: item.note ?? null,
        },
        { onConflict: "assessment_id,doc_type" }
      );
    if (error) throw new Error(`Gagal menyimpan ${item.docType}: ${error.message}`);
  }

  const { data, error } = await supabase
    .from("supervision_instrument_assessments")
    .select("*")
    .eq("id", assessmentId)
    .single();
  if (error) throw new Error(error.message);

  // Nilai final yang dibuka kembali ke draft tidak lagi tampil sebagai
  // skor resmi (dashboard/daftar/riwayat membaca overall_score).
  if (existing?.status === "final") {
    const { error: resetError } = await supabase
      .from("supervisions")
      .update({ overall_score: null })
      .eq("id", input.supervisionId);
    if (resetError) throw new Error(resetError.message);
  }

  return data as InstrumentAssessment;
}

/**
 * Finalisasi: wajib 12/12 aspek masing-masing punya skor 1-4.
 * Mengembalikan daftar label aspek yang belum lengkap bila gagal.
 */
export async function finalizeInstrumentAssessment(
  supervisionId: string
): Promise<InstrumentAssessment> {
  await assertLeader();
  const scope = await resolveScope(supervisionId);
  if (!scope) throw new Error("Supervisi tidak ditemukan");

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("supervision_instrument_assessments")
    .select("*")
    .eq("supervision_id", supervisionId)
    .maybeSingle();
  if (!assessment) {
    throw new Error("Belum ada penilaian. Simpan draft terlebih dahulu.");
  }
  const { data: items, error: itemsError } = await supabase
    .from("supervision_instrument_items")
    .select("doc_type, score")
    .eq("assessment_id", assessment.id);
  if (itemsError) throw new Error(itemsError.message);

  const byType = new Map((items ?? []).map((i) => [i.doc_type, i.score]));
  const missing = INSTRUMENT_ASPECTS.filter(
    (a) => !isValidInstrumentScore(byType.get(a.docType))
  ).map((a) => a.label);
  if (missing.length > 0) {
    throw new Error(
      `Belum bisa diselesaikan. Aspek tanpa skor: ${missing.join(", ")}`
    );
  }

  const total = totalInstrumentScore(
    (items ?? []).map((i) => ({ score: i.score }))
  );
  const value = calcInstrumentValue(total);
  const { data, error } = await supabase
    .from("supervision_instrument_assessments")
    .update({
      total_score: total,
      final_value: value,
      grade: gradeForValue(value),
      status: "final" as InstrumentStatus,
    })
    .eq("id", assessment.id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Teruskan nilai final ke skor resmi supervisi agar dashboard,
  // daftar, dan riwayat guru tetap berfungsi.
  const { error: syncError } = await supabase
    .from("supervisions")
    .update({ overall_score: value })
    .eq("id", supervisionId);
  if (syncError) throw new Error(syncError.message);

  return data as InstrumentAssessment;
}
