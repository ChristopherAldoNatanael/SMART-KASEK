"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { getOwnTeacherId } from "./teacher.service";
import { getSupervisionById } from "./supervision.service";
import { getInstrumentAssessment } from "./instrument-assessment.service";
import { getManagerialAssessment } from "./supervision-managerial.service";
import { getSupervisionStats } from "./supervision.service";
import { getCoachingStats, createCoachingSession } from "./coaching.service";
import { getTeachers } from "./teacher.service";
import {
  INSTRUMENT_ASPECTS,
  INSTRUMENT_MAX_SCORE,
} from "@/lib/supervision-instrument";
import {
  MANAGERIAL_I1_ITEMS,
  MANAGERIAL_I2_ITEMS,
  MANAGERIAL_I3_ITEMS,
} from "@/lib/supervision-managerial";
import {
  AIError,
  capList,
  capText,
  chatJson,
  stableHash,
} from "@/lib/ai";
import type { Database } from "@/types/database";

type AIInsightRow = Database["public"]["Tables"]["ai_insights"]["Row"];

export type SupervisionInsight = {
  summary: string;
  findings: string[];
  priorities: string[];
  actions: string[];
};

export type CoachingDraft = {
  focus: string;
  objective: string;
  steps: string[];
  followUpTarget: string;
  reflectionQuestions: string[];
};

export type SchoolInsight = {
  summary: string;
  attention: string[];
  actions: string[];
};

const SYSTEM_ID =
  "Kamu asisten analisis sekolah SMART KASEK. " +
  "Gunakan HANYA data yang diberikan, jangan mengarang fakta. " +
  "Jangan mengubah nilai, kategori, atau menentukan keputusan apa pun " +
  "(keputusan selalu milik Kepala Sekolah). " +
  "Berikan rekomendasi praktis untuk guru SD Indonesia. " +
  "Jawab SELALU dalam Bahasa Indonesia yang singkat, profesional, dan mudah dipahami. " +
  "Kembalikan HANYA objek JSON sesuai format yang diminta, tanpa teks lain.";

const DISCLAIMER =
  "AI memberikan saran berdasarkan data yang tersedia. Periksa kembali hasil sebelum digunakan sebagai dasar tindak lanjut.";

/* --------------------------------- Auth --------------------------------- */

async function requireSchoolUser(): Promise<CurrentUser & { schoolId: string }> {
  const user = await getCurrentUser();
  if (!user?.schoolId) throw new AIError("Akun Anda belum terhubung ke sekolah.");
  return user as CurrentUser & { schoolId: string };
}

function requirePrincipal(user: { role: string }): void {
  if (user.role !== "principal" && user.role !== "admin") {
    throw new AIError("Hanya Kepala Sekolah yang dapat menggunakan fitur ini.");
  }
}

/* ------------------------------ Cache (hemat token) ---------------------- */

async function findInsightCache(
  schoolId: string,
  type: string,
  refKey: string,
  refValue: string,
  hash: string
): Promise<AIInsightRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("school_id", schoolId)
    .eq("type", type)
    .eq("status", "active")
    .order("generated_at", { ascending: false })
    .limit(20);
  const now = Date.now();
  for (const row of (data ?? []) as AIInsightRow[]) {
    const src = (row.source_data ?? {}) as Record<string, unknown>;
    if (src[refKey] !== refValue || src.data_hash !== hash) continue;
    if (row.expires_at && new Date(row.expires_at).getTime() < now) continue;
    return row;
  }
  return null;
}

async function saveInsightCache(input: {
  schoolId: string;
  type: "supervision" | "coaching" | "school_performance";
  title: string;
  content: unknown;
  refKey: string;
  refValue: string;
  hash: string;
  ttlHours: number | null;
}): Promise<void> {
  const supabase = await createClient();
  // Cari baris referensi yang sama tanpa peduli hash (untuk update).
  const { data: same } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("school_id", input.schoolId)
    .eq("type", input.type)
    .eq("status", "active")
    .order("generated_at", { ascending: false })
    .limit(20);
  const prev = ((same ?? []) as AIInsightRow[]).find(
    (r) => ((r.source_data ?? {}) as Record<string, unknown>)[input.refKey] === input.refValue
  );
  const payload = {
    school_id: input.schoolId,
    type: input.type,
    title: input.title,
    content: JSON.stringify(input.content),
    priority: "medium",
    source_data: {
      [input.refKey]: input.refValue,
      data_hash: input.hash,
    },
    status: "active",
    ...(input.ttlHours === null
      ? {}
      : {
          expires_at: new Date(
            Date.now() + input.ttlHours * 3600 * 1000
          ).toISOString(),
        }),
  };
  if (prev) {
    await supabase.from("ai_insights").update(payload).eq("id", prev.id);
  } else {
    await supabase.from("ai_insights").insert(payload);
  }
}

async function logInteraction(input: {
  schoolId: string;
  userId: string;
  feature: "assistant" | "coach" | "school_insight";
  ref: Record<string, unknown>;
  response: unknown;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ai_interactions").insert({
    school_id: input.schoolId,
    user_id: input.userId,
    feature: input.feature,
    context: input.ref,
    response: input.response as Record<string, unknown>,
    model: (process.env.AI_MODEL ?? "").trim() || "gemini-2.5-flash",
  });
}

/* --------------------------- Payload supervisi --------------------------- */

type SupervisionPayload = {
  supervision_type: string;
  teacher: { name: string };
  academic_year: string | null;
  results: Record<string, unknown>;
  findings: string[];
  notes: string[];
};

async function buildSupervisionPayload(
  supervisionId: string
): Promise<{ payload: SupervisionPayload; hash: string; teacherId: string }> {
  const user = await requireSchoolUser();
  const supabase = await createClient();

  const { data: supervision, error } = await supabase
    .from("supervisions")
    .select("id, kind, academic_year, teacher_id")
    .eq("id", supervisionId)
    .eq("school_id", user.schoolId)
    .single();
  if (error || !supervision) {
    throw new AIError("Data supervisi tidak ditemukan.");
  }
  const kind = (supervision.kind ?? "academic") as string;

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, profile:profiles(full_name)")
    .eq("id", supervision.teacher_id)
    .single();
  const teacherName =
    ((teacher as { profile?: { full_name?: string | null } | null } | null)?.profile
      ?.full_name ?? "Guru").slice(0, 60);

  const findings: string[] = [];
  const notes: string[] = [];
  let results: Record<string, unknown> = {};

  if (kind === "managerial") {
    const assessment = await getManagerialAssessment(supervisionId);
    if (!assessment || assessment.items.length === 0) {
      throw new AIError("Belum ada hasil penilaian untuk dianalisis.");
    }
    const byKey = new Map(
      assessment.items.map((i) => [`${i.instrument}:${i.item_key}`, i])
    );
    const i1Weak: string[] = [];
    for (const def of MANAGERIAL_I1_ITEMS) {
      const found = byKey.get(`i1:${def.key}`);
      if (found && typeof found.score === "number" && found.score <= 2) {
        i1Weak.push(`${def.label} (skor ${found.score})`);
        if (found.note) notes.push(`${def.label}: ${found.note.slice(0, 200)}`);
      }
    }
    const i2Missing: string[] = [];
    for (const def of MANAGERIAL_I2_ITEMS) {
      const found = byKey.get(`i2:${def.key}`);
      if (found && found.present === false) {
        i2Missing.push(def.label);
        if (found.note) notes.push(`${def.label}: ${found.note.slice(0, 200)}`);
      }
    }
    const i3Weak: string[] = [];
    for (const def of MANAGERIAL_I3_ITEMS) {
      const found = byKey.get(`i3:${def.key}`);
      if (found && typeof found.score === "number" && found.score <= 2) {
        i3Weak.push(`${def.label} (skor ${found.score})`);
        if (found.note) notes.push(`${def.label}: ${found.note.slice(0, 200)}`);
      }
    }
    findings.push(
      ...i1Weak.slice(0, 5),
      ...i2Missing.slice(0, 5).map((l) => `${l} (belum ada)`),
      ...i3Weak.slice(0, 5)
    );
    const a = assessment.assessment;
    results = {
      instrument_1: { value: Number(a.i1_value), max: 100 },
      instrument_2: { completed: a.i2_present, total: 10, value: Number(a.i2_value) },
      instrument_3: { value: Number(a.i3_value), max: 100 },
      overall: a.overall_value == null ? null : Number(a.overall_value),
      grade: a.grade,
    };
  } else {
    const instrument = await getInstrumentAssessment(supervisionId);
    if (!instrument || instrument.items.length === 0) {
      throw new AIError("Belum ada hasil penilaian untuk dianalisis.");
    }
    const labelByType = new Map<string, string>(
      INSTRUMENT_ASPECTS.map((a) => [a.docType, a.label])
    );
    const weak: string[] = [];
    for (const item of instrument.items) {
      const label = labelByType.get(item.doc_type) ?? item.doc_type;
      if (typeof item.score === "number" && item.score <= 2) {
        weak.push(`${label} (skor ${item.score})`);
        if (item.note) notes.push(`${label}: ${(item.note ?? "").slice(0, 200)}`);
      }
    }
    findings.push(...weak.slice(0, 8));
    const asm = instrument.assessment;
    results = {
      total_score: asm.total_score,
      max_score: INSTRUMENT_MAX_SCORE,
      value: Number(asm.final_value),
      grade: asm.grade,
    };
  }

  const payload: SupervisionPayload = {
    supervision_type: kind,
    teacher: { name: teacherName },
    academic_year: supervision.academic_year,
    results,
    findings: findings.slice(0, 12),
    notes: notes.slice(0, 8),
  };
  return {
    payload,
    hash: stableHash(payload),
    teacherId: supervision.teacher_id,
  };
}

/* ------------------------------ AI Insight ------------------------------- */

export type InsightResult = {
  cached: boolean;
  insight: SupervisionInsight;
};

const INSIGHT_SYSTEM =
  SYSTEM_ID +
  " Tugas: rangkum SATU hasil supervisi guru. Kembalikan JSON: " +
  '{"summary":"1 paragraf ringkas (maks 60 kata)","key_findings":["maks 3, dari temuan yang diberikan"],"priorities":["maks 3, paling mendesak dulu"],"suggested_actions":["maks 3, praktis untuk guru SD"]}. ' +
  "Jangan menilai kepribadian guru. Jangan mengubah angka apa pun.";

export async function getSupervisionInsight(
  supervisionId: string,
  refresh = false
): Promise<InsightResult> {
  const user = await requireSchoolUser();
  // Guru boleh membaca hasil tersimpan; hanya Kepala Sekolah yang
  // boleh meminta analisis baru (hemat token + wewenang jelas).
  if (refresh) requirePrincipal(user);

  const { payload, hash } = await buildSupervisionPayload(supervisionId);
  const cached = await findInsightCache(
    user.schoolId,
    "supervision",
    "supervision_id",
    supervisionId,
    hash
  );
  if (cached && !refresh) {
    try {
      const parsed = JSON.parse(cached.content) as SupervisionInsight;
      return { cached: true, insight: sanitizeInsight(parsed) };
    } catch {
      // Cache rusak — lanjutkan generate ulang.
    }
  }
  if (user.role !== "principal" && user.role !== "admin") {
    throw new AIError("Belum ada hasil analisis. Kepala Sekolah dapat memintanya.");
  }

  const raw = await chatJson<Record<string, unknown>>({
    system: INSIGHT_SYSTEM,
    user: `Data hasil supervisi (angka sudah final, jangan diubah):\n${JSON.stringify(payload)}`,
    // Pagu longgar (terpakai sesuai panjang jawaban; Bahasa Indonesia boros token).
    maxTokens: 800,
  });
  const insight = sanitizeInsight({
    summary: raw.summary,
    findings: raw.key_findings,
    priorities: raw.priorities,
    actions: raw.suggested_actions,
  });

  await saveInsightCache({
    schoolId: user.schoolId,
    type: "supervision",
    title: `Insight supervisi — ${payload.teacher.name}`,
    content: insight,
    refKey: "supervision_id",
    refValue: supervisionId,
    hash,
    ttlHours: null,
  });
  await logInteraction({
    schoolId: user.schoolId,
    userId: user.id,
    feature: "assistant",
    ref: { supervision_id: supervisionId, data_hash: hash },
    response: insight,
  });
  return { cached: false, insight };
}

function sanitizeInsight(value: {
  summary?: unknown;
  findings?: unknown;
  priorities?: unknown;
  actions?: unknown;
}): SupervisionInsight {
  return {
    summary: capText(value.summary, 500) || "Ringkasan belum tersedia.",
    findings: capList(value.findings, 3),
    priorities: capList(value.priorities, 3),
    actions: capList(value.actions, 3),
  };
}

/* -------------------------------- AI Coach ------------------------------- */

const COACH_SYSTEM =
  SYSTEM_ID +
  " Tugas: susun DRAF rencana coaching untuk guru berdasarkan temuan supervisi. " +
  "Ini draf yang akan direview manusia — bukan keputusan. Kembalikan JSON: " +
  '{"focus":"1 fokus utama","objective":"1 tujuan (maks 40 kata)","steps":["3-5 langkah sederhana"],"follow_up_target":"1 target tindak lanjut yang bisa dilakukan guru","reflection_questions":["2-3 pertanyaan refleksi untuk guru"]}.';

export async function generateCoachingDraft(
  supervisionId: string
): Promise<CoachingDraft> {
  const user = await requireSchoolUser();
  requirePrincipal(user);

  const { payload, hash } = await buildSupervisionPayload(supervisionId);
  const cached = await findInsightCache(
    user.schoolId,
    "coaching",
    "supervision_id",
    supervisionId,
    hash
  );
  if (cached) {
    try {
      const parsed = JSON.parse(cached.content) as CoachingDraft;
      return sanitizeDraft(parsed);
    } catch {
      // Lanjut generate ulang.
    }
  }

  const raw = await chatJson<Record<string, unknown>>({
    system: COACH_SYSTEM,
    user: `Temuan supervisi (angka sudah final, jangan diubah):\n${JSON.stringify(payload)}`,
    maxTokens: 1200,
  });
  const draft = sanitizeDraft({
    focus: raw.focus,
    objective: raw.objective,
    steps: raw.steps,
    followUpTarget: raw.follow_up_target,
    reflectionQuestions: raw.reflection_questions,
  });

  await saveInsightCache({
    schoolId: user.schoolId,
    type: "coaching",
    title: `Draf coaching — ${payload.teacher.name}`,
    content: draft,
    refKey: "supervision_id",
    refValue: supervisionId,
    hash,
    ttlHours: null,
  });
  await logInteraction({
    schoolId: user.schoolId,
    userId: user.id,
    feature: "coach",
    ref: { supervision_id: supervisionId, data_hash: hash },
    response: draft,
  });
  return draft;
}

function sanitizeDraft(value: {
  focus?: unknown;
  objective?: unknown;
  steps?: unknown;
  followUpTarget?: unknown;
  reflectionQuestions?: unknown;
}): CoachingDraft {
  const steps = capList(value.steps, 5);
  return {
    focus: capText(value.focus, 200) || "Fokus pembinaan",
    objective: capText(value.objective, 400) || "Tujuan pembinaan",
    steps: steps.length > 0 ? steps : ["Diskusikan temuan supervisi bersama guru."],
    followUpTarget: capText(value.followUpTarget, 300) || "Tindak lanjut disepakati bersama.",
    reflectionQuestions: capList(value.reflectionQuestions, 3),
  };
}

/**
 * Simpan draf yang SUDAH direview manusia ke alur Coaching existing.
 * Tidak ada penyimpanan otomatis — hanya lewat aksi eksplisit ini.
 */
export async function saveCoachingDraft(input: {
  supervisionId: string;
  teacherId: string;
  sessionDate: string;
  focus: string;
  objective: string;
  steps: string[];
  followUpTarget: string;
  reflectionQuestions: string[];
}): Promise<{ sessionId: string }> {
  const user = await requireSchoolUser();
  requirePrincipal(user);

  // Verifikasi silang: supervisi milik sekolah ini (jangan percaya ID mentah).
  const check = await buildSupervisionPayload(input.supervisionId).catch(() => null);
  if (!check || check.teacherId !== input.teacherId) {
    throw new AIError("Data supervisi tidak valid untuk coaching ini.");
  }

  const steps = input.steps.map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const reflection = input.reflectionQuestions
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const session = await createCoachingSession({
    teacherId: input.teacherId,
    supervisionId: input.supervisionId,
    sessionDate: input.sessionDate,
    focusArea: input.focus.trim().slice(0, 500) || "Pembinaan guru",
    summary:
      `${input.objective.trim().slice(0, 1000)}` +
      (reflection.length > 0
        ? `\n\nPertanyaan refleksi:\n${reflection.map((q) => `- ${q}`).join("\n")}`
        : ""),
    discussion:
      steps.length > 0
        ? steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : undefined,
    agreement: input.followUpTarget.trim().slice(0, 1000) || undefined,
    status: "scheduled",
    actions:
      input.followUpTarget.trim() === ""
        ? []
        : [{ action: input.followUpTarget.trim().slice(0, 500) }],
  });
  return { sessionId: session.id };
}

/* ----------------------------- School Insight ---------------------------- */

export type SchoolInsightResult = {
  cached: boolean;
  generatedAt: string | null;
  insight: SchoolInsight;
};

const SCHOOL_SYSTEM =
  SYSTEM_ID +
  " Tugas: baca KONDISI AGREGAT satu sekolah (bukan menilai individu). " +
  "Kembalikan JSON: " +
  '{"summary":"1 paragraf pendek kondisi sekolah","attention_points":["maks 3 hal yang perlu diperhatikan"],"suggested_actions":["maks 3 saran tindakan untuk Kepala Sekolah"]}. ' +
  "Singkat, tidak menghakimi.";

export async function getSchoolInsight(
  refresh = false
): Promise<SchoolInsightResult> {
  const user = await requireSchoolUser();
  requirePrincipal(user);
  const supabase = await createClient();

  const [supervision, coaching, teachers] = await Promise.all([
    getSupervisionStats(),
    getCoachingStats(),
    getTeachers(),
  ]);
  const stats = {
    teachers: { total: teachers.length },
    supervision: {
      total: supervision.total,
      draft: supervision.draft,
      completed: supervision.completed,
      follow_up: supervision.followUp,
      closed: supervision.closed,
      average_score: supervision.averageScore,
    },
    coaching: {
      total_sessions: coaching.totalSessions,
      pending_actions: coaching.pendingActions,
      overdue_actions: coaching.overdueActions,
      completed_actions: coaching.completedActions,
    },
  };
  const hash = stableHash(stats);

  const cached = await findInsightCache(
    user.schoolId,
    "school_performance",
    "scope",
    "school",
    hash
  );
  if (cached && !refresh) {
    try {
      const parsed = JSON.parse(cached.content) as SchoolInsight;
      return {
        cached: true,
        generatedAt: cached.generated_at,
        insight: sanitizeSchool(parsed),
      };
    } catch {
      // Lanjut generate ulang.
    }
  }

  const raw = await chatJson<Record<string, unknown>>({
    system: SCHOOL_SYSTEM,
    user: `Statistik agregat sekolah (jangan sebut nama individu):\n${JSON.stringify(stats)}`,
    maxTokens: 800,
  });
  const insight = sanitizeSchool({
    summary: raw.summary,
    attention: raw.attention_points,
    actions: raw.suggested_actions,
  });

  await saveInsightCache({
    schoolId: user.schoolId,
    type: "school_performance",
    title: "Insight kondisi sekolah",
    content: insight,
    refKey: "scope",
    refValue: "school",
    hash,
    ttlHours: 24,
  });
  await logInteraction({
    schoolId: user.schoolId,
    userId: user.id,
    feature: "school_insight",
    ref: { stats_hash: hash },
    response: insight,
  });

  const { data: fresh } = await supabase
    .from("ai_insights")
    .select("generated_at")
    .eq("school_id", user.schoolId)
    .eq("type", "school_performance")
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();
  return {
    cached: false,
    generatedAt: (fresh as { generated_at?: string } | null)?.generated_at ?? null,
    insight,
  };
}

/**
 * Baca insight sekolah tersimpan TANPA memanggil AI.
 * Untuk render awal dashboard (tidak boleh menghabiskan token).
 */
export async function getCachedSchoolInsight(): Promise<{
  generatedAt: string;
  insight: SchoolInsight;
} | null> {
  const user = await requireSchoolUser();
  if (user.role !== "principal" && user.role !== "admin") return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("type", "school_performance")
    .eq("status", "active")
    .order("generated_at", { ascending: false })
    .limit(5);
  const now = Date.now();
  const row = ((data ?? []) as AIInsightRow[]).find((r) => {
    const src = (r.source_data ?? {}) as Record<string, unknown>;
    if (src.scope !== "school") return false;
    if (r.expires_at && new Date(r.expires_at).getTime() < now) return false;
    return true;
  });
  if (!row) return null;
  try {
    return {
      generatedAt: row.generated_at,
      insight: sanitizeSchool(JSON.parse(row.content) as SchoolInsight),
    };
  } catch {
    return null;
  }
}

function sanitizeSchool(value: {
  summary?: unknown;
  attention?: unknown;
  actions?: unknown;
}): SchoolInsight {
  return {
    summary: capText(value.summary, 500) || "Ringkasan belum tersedia.",
    attention: capList(value.attention, 3),
    actions: capList(value.actions, 3),
  };
}

/** Hasil tersimpan untuk dibaca guru (tanpa generate) di detail final. */
export async function getCachedSupervisionInsight(
  supervisionId: string
): Promise<SupervisionInsight | null> {
  const user = await requireSchoolUser();
  let teacherOk = user.role === "principal" || user.role === "admin";
  if (!teacherOk && user.role === "teacher") {
    const ownId = await getOwnTeacherId(user.id, user.schoolId);
    const supervision = await getSupervisionById(supervisionId).catch(() => null);
    teacherOk = !!ownId && !!supervision && supervision.teacher_id === ownId;
  }
  if (!teacherOk) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("school_id", user.schoolId)
    .eq("type", "supervision")
    .eq("status", "active")
    .order("generated_at", { ascending: false })
    .limit(20);
  const row = ((data ?? []) as AIInsightRow[]).find(
    (r) => ((r.source_data ?? {}) as Record<string, unknown>).supervision_id === supervisionId
  );
  if (!row) return null;
  try {
    return sanitizeInsight(JSON.parse(row.content) as SupervisionInsight);
  } catch {
    return null;
  }
}
