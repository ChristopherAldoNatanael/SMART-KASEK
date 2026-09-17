"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnTeacherId } from "./teacher.service";
import {
  calcManagerialBinaryValue,
  calcManagerialOverall,
  calcManagerialScoreValue,
  isValidManagerialScore,
  MANAGERIAL_I1_ITEMS,
  MANAGERIAL_I1_MAX,
  MANAGERIAL_I2_ITEMS,
  MANAGERIAL_I3_ITEMS,
  MANAGERIAL_I3_MAX,
  managerialGradeForValue,
  type ManagerialInstrumentKey,
  type ManagerialInstrumentStatus,
} from "@/lib/supervision-managerial";
import type { Database } from "@/types/database";

type Supervision = Database["public"]["Tables"]["supervisions"]["Row"];
type ManagerialAssessment =
  Database["public"]["Tables"]["supervision_managerial_assessments"]["Row"];
type ManagerialItem =
  Database["public"]["Tables"]["supervision_managerial_items"]["Row"];

export type ManagerialSupervision = Supervision & {
  teacher: {
    id: string;
    subject: string | null;
    nip: string | null;
    profile: { full_name: string | null } | null;
  } | null;
  supervisor: { id: string; full_name: string | null } | null;
  managerial: ManagerialAssessment | null;
};

export type ManagerialAssessmentWithItems = {
  assessment: ManagerialAssessment;
  items: ManagerialItem[];
};

export type ScoreInput = { key: string; score: number | null; note?: string };
export type BinaryInput = {
  key: string;
  present: boolean | null;
  note?: string;
};

const I1_KEYS = new Set(MANAGERIAL_I1_ITEMS.map((i) => i.key));
const I2_KEYS = new Set(MANAGERIAL_I2_ITEMS.map((i) => i.key));
const I3_KEYS = new Set(MANAGERIAL_I3_ITEMS.map((i) => i.key));

async function teacherScope(
  role: string,
  profileId: string,
  schoolId: string
): Promise<{ scoped: boolean; teacherId: string | null }> {
  if (role !== "teacher") return { scoped: false, teacherId: null };
  return { scoped: true, teacherId: await getOwnTeacherId(profileId, schoolId) };
}

async function assertLeader(): Promise<{ schoolId: string; evaluatorId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  if (user.role !== "principal" && user.role !== "admin") {
    throw new Error("Hanya Kepala Sekolah yang dapat menilai");
  }
  return { schoolId: user.schoolId, evaluatorId: user.id };
}

/**
 * Scope: supervisi manajerial milik sekolah user; guru hanya miliknya sendiri.
 * Mengembalikan baris supervisi (wajib kind='managerial').
 */
async function resolveScope(supervisionId: string): Promise<{
  schoolId: string;
  supervision: Supervision;
} | null> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("supervisions")
    .select("*")
    .eq("id", supervisionId)
    .eq("school_id", user.schoolId)
    .eq("kind", "managerial")
    .single();
  if (!data) return null;
  if (user.role === "teacher") {
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
    if (!ownId || ownId !== (data as Supervision).teacher_id) return null;
  }
  return { schoolId: user.schoolId, supervision: data as Supervision };
}

function sanitizeScoreItems(items: ScoreInput[], keys: Set<string>): ScoreInput[] {
  const seen = new Set<string>();
  const clean: ScoreInput[] = [];
  for (const item of items) {
    if (!keys.has(item.key) || seen.has(item.key)) continue;
    seen.add(item.key);
    clean.push({
      key: item.key,
      score: isValidManagerialScore(item.score) ? item.score : null,
      note: item.note?.trim().slice(0, 2000) || undefined,
    });
  }
  return clean;
}

function sanitizeBinaryItems(items: BinaryInput[]): BinaryInput[] {
  const seen = new Set<string>();
  const clean: BinaryInput[] = [];
  for (const item of items) {
    if (!I2_KEYS.has(item.key) || seen.has(item.key)) continue;
    seen.add(item.key);
    clean.push({
      key: item.key,
      present:
        item.present === true ? true : item.present === false ? false : null,
      note: item.note?.trim().slice(0, 2000) || undefined,
    });
  }
  return clean;
}

async function getOrCreateAssessment(
  supervisionId: string,
  evaluatorId: string
): Promise<ManagerialAssessment> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("supervision_managerial_assessments")
    .select("*")
    .eq("supervision_id", supervisionId)
    .maybeSingle();
  if (existing) return existing as ManagerialAssessment;
  const { data, error } = await supabase
    .from("supervision_managerial_assessments")
    .insert({ supervision_id: supervisionId, evaluator_id: evaluatorId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ManagerialAssessment;
}

function aggregateScore(items: ScoreInput[], max: number) {
  const total = items.reduce(
    (sum, i) => sum + (typeof i.score === "number" ? i.score : 0),
    0
  );
  return { total, value: calcManagerialScoreValue(total, max) };
}

function aggregateBinary(items: BinaryInput[]) {
  const present = items.filter((i) => i.present === true).length;
  return { present, value: calcManagerialBinaryValue(present) };
}

/** Hitung ulang agregat header dari seluruh item tersimpan. */
async function refreshAggregates(assessmentId: string): Promise<ManagerialAssessment> {
  const supabase = await createClient();
  const { data: items, error: itemsError } = await supabase
    .from("supervision_managerial_items")
    .select("instrument, item_key, score, present")
    .eq("assessment_id", assessmentId);
  if (itemsError) throw new Error(itemsError.message);

  const rows = (items ?? []) as Pick<
    ManagerialItem,
    "instrument" | "item_key" | "score" | "present"
  >[];
  const i1 = rows
    .filter((r) => r.instrument === "i1")
    .map((r) => ({ key: r.item_key, score: r.score }));
  const i2 = rows
    .filter((r) => r.instrument === "i2")
    .map((r) => ({ key: r.item_key, present: r.present }));
  const i3 = rows
    .filter((r) => r.instrument === "i3")
    .map((r) => ({ key: r.item_key, score: r.score }));

  const a1 = aggregateScore(i1, MANAGERIAL_I1_MAX);
  const a2 = aggregateBinary(i2);
  const a3 = aggregateScore(i3, MANAGERIAL_I3_MAX);
  const overall = calcManagerialOverall(
    [
      i1.length > 0 ? a1.value : null,
      i2.length > 0 ? a2.value : null,
      i3.length > 0 ? a3.value : null,
    ]
  );

  const { data, error } = await supabase
    .from("supervision_managerial_assessments")
    .update({
      i1_total: a1.total,
      i1_value: a1.value,
      i2_present: a2.present,
      i2_value: a2.value,
      i3_total: a3.total,
      i3_value: a3.value,
      overall_value: overall,
      grade: managerialGradeForValue(overall ?? 0),
    })
    .eq("id", assessmentId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ManagerialAssessment;
}

/* --------------------------------- Query -------------------------------- */

export async function getManagerialSupervisions(): Promise<ManagerialSupervision[]> {
  const user = await getCurrentUser();
  if (!user?.schoolId) return [];
  const supabase = await createClient();
  const scope = await teacherScope(user.role, user.id, user.schoolId);
  if (scope.scoped && !scope.teacherId) return [];

  let query = supabase
    .from("supervisions")
    .select(
      `
      *,
      teacher:teachers(id, subject, nip, profile:profiles(full_name)),
      supervisor:profiles(full_name),
      managerial:supervision_managerial_assessments(*)
    `
    )
    .eq("school_id", user.schoolId)
    .eq("kind", "managerial")
    .order("supervision_date", { ascending: false });

  if (scope.scoped && scope.teacherId) {
    query = query.eq("teacher_id", scope.teacherId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ManagerialSupervision[];
}

export async function getManagerialSupervisionById(
  id: string
): Promise<ManagerialSupervision | null> {
  const scope = await resolveScope(id);
  if (!scope) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervisions")
    .select(
      `
      *,
      teacher:teachers(id, subject, nip, profile:profiles(full_name)),
      supervisor:profiles(full_name),
      managerial:supervision_managerial_assessments(*)
    `
    )
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as unknown as ManagerialSupervision;
}

export async function getManagerialAssessment(
  supervisionId: string
): Promise<ManagerialAssessmentWithItems | null> {
  const scope = await resolveScope(supervisionId);
  if (!scope) return null;
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("supervision_managerial_assessments")
    .select("*")
    .eq("supervision_id", supervisionId)
    .maybeSingle();
  if (!assessment) return null;
  const { data: items, error } = await supabase
    .from("supervision_managerial_items")
    .select("*")
    .eq("assessment_id", (assessment as ManagerialAssessment).id)
    .order("item_key");
  if (error) throw new Error(error.message);
  return {
    assessment: assessment as ManagerialAssessment,
    items: (items ?? []) as ManagerialItem[],
  };
}

export async function getManagerialStats(): Promise<{
  total: number;
  draft: number;
  final: number;
  averageScore: number | null;
}> {
  const user = await getCurrentUser();
  if (!user?.schoolId) {
    return { total: 0, draft: 0, final: 0, averageScore: null };
  }
  const supabase = await createClient();
  const scope = await teacherScope(user.role, user.id, user.schoolId);
  if (scope.scoped && !scope.teacherId) {
    return { total: 0, draft: 0, final: 0, averageScore: null };
  }

  let query = supabase
    .from("supervisions")
    .select(
      "id, teacher_id, managerial:supervision_managerial_assessments(status, overall_value)"
    )
    .eq("school_id", user.schoolId)
    .eq("kind", "managerial");

  if (scope.scoped && scope.teacherId) {
    query = query.eq("teacher_id", scope.teacherId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let draft = 0;
  let final = 0;
  const scores: number[] = [];
  for (const row of (data ?? []) as unknown as {
    managerial: { status: string; overall_value: number | null } | null;
  }[]) {
    if (!row.managerial) {
      draft++;
      continue;
    }
    if (row.managerial.status === "final") {
      final++;
      if (typeof row.managerial.overall_value === "number") {
        scores.push(row.managerial.overall_value);
      }
    } else {
      draft++;
    }
  }

  return {
    total: (data ?? []).length,
    draft,
    final,
    averageScore:
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : null,
  };
}

/* --------------------------------- Mutasi ------------------------------- */

export async function createManagerialSupervision(input: {
  teacherId: string;
  supervisionDate: string;
  academicYear?: string;
  period?: string;
}): Promise<Supervision> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new Error("No school access");
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", input.teacherId)
    .eq("school_id", user.schoolId)
    .single();
  if (!teacher) throw new Error("Guru tidak ditemukan");

  const { data, error } = await supabase
    .from("supervisions")
    .insert({
      school_id: user.schoolId,
      teacher_id: input.teacherId,
      supervisor_id: user.id,
      supervision_date: input.supervisionDate,
      type: "Supervisi Manajerial",
      kind: "managerial",
      academic_year: input.academicYear?.trim() || "2026/2027",
      period: input.period?.trim() || null,
      status: "draft",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Supervision;
}

async function upsertItems(
  assessmentId: string,
  instrument: ManagerialInstrumentKey,
  rows: { key: string; score: number | null; present: boolean | null; note?: string }[]
): Promise<void> {
  const supabase = await createClient();
  for (const row of rows) {
    const { error } = await supabase.from("supervision_managerial_items").upsert(
      {
        assessment_id: assessmentId,
        instrument,
        item_key: row.key,
        score: row.score,
        present: row.present,
        note: row.note ?? null,
      },
      { onConflict: "assessment_id,instrument,item_key" }
    );
    if (error) throw new Error(`Gagal menyimpan ${row.key}: ${error.message}`);
  }
}

/** Simpan draft satu instrumen (parsial OK). Final yang dibuka kembali ke draft. */
export async function saveManagerialDraft(
  supervisionId: string,
  instrument: ManagerialInstrumentKey,
  items: ScoreInput[] | BinaryInput[]
): Promise<ManagerialAssessment> {
  const { evaluatorId } = await assertLeader();
  const scope = await resolveScope(supervisionId);
  if (!scope) throw new Error("Supervisi tidak ditemukan");

  const assessment = await getOrCreateAssessment(supervisionId, evaluatorId);

  if (instrument === "i1") {
    const clean = sanitizeScoreItems(items as ScoreInput[], I1_KEYS);
    await upsertItems(
      assessment.id,
      "i1",
      clean.map((i) => ({ key: i.key, score: i.score, present: null, note: i.note }))
    );
  } else if (instrument === "i2") {
    const clean = sanitizeBinaryItems(items as BinaryInput[]);
    await upsertItems(
      assessment.id,
      "i2",
      clean.map((i) => ({ key: i.key, score: null, present: i.present, note: i.note }))
    );
  } else {
    const clean = sanitizeScoreItems(items as ScoreInput[], I3_KEYS);
    await upsertItems(
      assessment.id,
      "i3",
      clean.map((i) => ({ key: i.key, score: i.score, present: null, note: i.note }))
    );
  }

  const supabase = await createClient();
  // Menyimpan ulang instrumen final mengembalikannya ke draft.
  const statusPatch: Record<string, ManagerialInstrumentStatus> = {};
  if (instrument === "i1" && assessment.i1_status === "final")
    statusPatch.i1_status = "draft";
  if (instrument === "i2" && assessment.i2_status === "final")
    statusPatch.i2_status = "draft";
  if (instrument === "i3" && assessment.i3_status === "final")
    statusPatch.i3_status = "draft";
  if (Object.keys(statusPatch).length > 0 || assessment.status === "final") {
    const { error } = await supabase
      .from("supervision_managerial_assessments")
      .update({ ...statusPatch, status: "draft", finalized_at: null })
      .eq("id", assessment.id);
    if (error) throw new Error(error.message);
    // Nilai resmi tidak lagi tampil sebagai final.
    const { error: resetError } = await supabase
      .from("supervisions")
      .update({ overall_score: null })
      .eq("id", supervisionId);
    if (resetError) throw new Error(resetError.message);
  }

  return refreshAggregates(assessment.id);
}

const REQUIRED_COUNTS: Record<ManagerialInstrumentKey, number> = {
  i1: MANAGERIAL_I1_ITEMS.length,
  i2: MANAGERIAL_I2_ITEMS.length,
  i3: MANAGERIAL_I3_ITEMS.length,
};

/** Finalisasi satu instrumen: wajib semua indikator terjawab. */
export async function finalizeManagerialInstrument(
  supervisionId: string,
  instrument: ManagerialInstrumentKey
): Promise<ManagerialAssessment> {
  await assertLeader();
  const scope = await resolveScope(supervisionId);
  if (!scope) throw new Error("Supervisi tidak ditemukan");

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("supervision_managerial_assessments")
    .select("*")
    .eq("supervision_id", supervisionId)
    .maybeSingle();
  if (!assessment) {
    throw new Error("Belum ada penilaian. Simpan draft terlebih dahulu.");
  }
  const row = assessment as ManagerialAssessment;
  const { data: items, error: itemsError } = await supabase
    .from("supervision_managerial_items")
    .select("item_key, score, present")
    .eq("assessment_id", row.id)
    .eq("instrument", instrument);
  if (itemsError) throw new Error(itemsError.message);

  const defs =
    instrument === "i1"
      ? MANAGERIAL_I1_ITEMS
      : instrument === "i2"
        ? MANAGERIAL_I2_ITEMS
        : MANAGERIAL_I3_ITEMS;
  const byKey = new Map(
    ((items ?? []) as Pick<ManagerialItem, "item_key" | "score" | "present">[]).map(
      (i) => [i.item_key, i]
    )
  );
  const missing = defs.filter((d) => {
    const found = byKey.get(d.key);
    if (!found) return true;
    if (instrument === "i2") return found.present !== true && found.present !== false;
    return !isValidManagerialScore(found.score);
  });
  if (missing.length > 0) {
    throw new Error(
      `Belum bisa diselesaikan. Belum terjawab (${missing.length}/${REQUIRED_COUNTS[instrument]}): ${missing.map((m) => m.label).join(", ")}`
    );
  }

  const patch =
    instrument === "i1"
      ? { i1_status: "final" as ManagerialInstrumentStatus }
      : instrument === "i2"
        ? { i2_status: "final" as ManagerialInstrumentStatus }
        : { i3_status: "final" as ManagerialInstrumentStatus };

  const { error } = await supabase
    .from("supervision_managerial_assessments")
    .update(patch)
    .eq("id", row.id);
  if (error) throw new Error(error.message);

  return refreshAggregates(row.id);
}

/**
 * Finalisasi keseluruhan: wajib I1 + I2 + I3 final.
 * Menulis nilai resmi ke supervisions.overall_score.
 */
export async function finalizeManagerialOverall(
  supervisionId: string
): Promise<ManagerialAssessment> {
  await assertLeader();
  const scope = await resolveScope(supervisionId);
  if (!scope) throw new Error("Supervisi tidak ditemukan");

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("supervision_managerial_assessments")
    .select("*")
    .eq("supervision_id", supervisionId)
    .maybeSingle();
  if (!assessment) throw new Error("Belum ada penilaian.");
  const row = assessment as ManagerialAssessment;

  const pending: string[] = [];
  if (row.i1_status !== "final") pending.push("Instrumen 1");
  if (row.i2_status !== "final") pending.push("Instrumen 2");
  if (row.i3_status !== "final") pending.push("Instrumen 3");
  if (pending.length > 0) {
    throw new Error(`Belum bisa difinalisasi. Selesaikan dulu: ${pending.join(", ")}.`);
  }

  const refreshed = await refreshAggregates(row.id);
  const { data, error } = await supabase
    .from("supervision_managerial_assessments")
    .update({ status: "final", finalized_at: new Date().toISOString() })
    .eq("id", row.id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: syncError } = await supabase
    .from("supervisions")
    .update({ overall_score: refreshed.overall_value })
    .eq("id", supervisionId);
  if (syncError) throw new Error(syncError.message);

  return data as ManagerialAssessment;
}

/** Simpan catatan & tindak lanjut (Kepala Sekolah). */
export async function saveManagerialFollowUp(input: {
  supervisionId: string;
  findings?: string;
  supervisorNotes?: string;
  followUpRecommendation?: string;
  improvementTarget?: string;
  followUpStatus?: string;
}): Promise<ManagerialAssessment> {
  const { evaluatorId } = await assertLeader();
  const scope = await resolveScope(input.supervisionId);
  if (!scope) throw new Error("Supervisi tidak ditemukan");

  const assessment = await getOrCreateAssessment(input.supervisionId, evaluatorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervision_managerial_assessments")
    .update({
      findings: input.findings?.trim() || null,
      supervisor_notes: input.supervisorNotes?.trim() || null,
      follow_up_recommendation: input.followUpRecommendation?.trim() || null,
      improvement_target: input.improvementTarget?.trim() || null,
      follow_up_status: input.followUpStatus ?? "none",
    })
    .eq("id", assessment.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ManagerialAssessment;
}
