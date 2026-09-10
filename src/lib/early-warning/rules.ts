/**
 * Deterministic Early Warning rule engine (AGENTS.md §17).
 *
 * Pure functions — no server/DB dependencies, fully testable.
 * Rules decide WHETHER a warning exists and its SEVERITY.
 * AI is only ever used to EXPLAIN a finding, never to set severity.
 */

export const WARNING_THRESHOLDS = {
  /** score < 75 → low */
  lowScore: 75,
  /** score < 70 → medium */
  mediumScore: 70,
  /** score < 60 (+ overdue follow-up) → high/critical */
  highScore: 60,
  /** coaching dianggap basi setelah N hari */
  coachingStaleDays: 30,
} as const;

export type WarningSeverity = "low" | "medium" | "high" | "critical";

export type WarningType =
  | "low_growth"
  | "declining_growth"
  | "low_supervision_score"
  | "overdue_follow_up"
  | "stale_coaching"
  | "critical_risk";

export interface TeacherWarningSignals {
  teacherId: string;
  teacherName: string;
  subject: string | null;
  latestGrowth: number | null;
  previousGrowth: number | null;
  latestSupervisionScore: number | null;
  /** null = belum pernah coaching */
  daysSinceCoaching: number | null;
  pendingActions: number;
  overdueActions: number;
}

export interface WarningFinding {
  teacherId: string;
  teacherName: string;
  subject: string | null;
  type: WarningType;
  severity: WarningSeverity;
  evidence: string[];
  recommendation: string;
}

const TYPE_TITLES: Record<WarningType, string> = {
  low_growth: "Skor perkembangan rendah",
  declining_growth: "Perkembangan menurun",
  low_supervision_score: "Skor supervisi rendah",
  overdue_follow_up: "Tindak lanjut terlambat",
  stale_coaching: "Belum ada coaching terbaru",
  critical_risk: "Risiko ganda (perlu perhatian segera)",
};

/** Human-readable title for a warning type (used when persisting). */
export function warningTitle(type: WarningType): string {
  return TYPE_TITLES[type];
}

function severityRank(s: WarningSeverity): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[s];
}

/**
 * Evaluate all rules for one teacher. Returns findings sorted
 * by severity (highest first). Returns [] when no rule fires.
 */
export function evaluateTeacherWarnings(
  s: TeacherWarningSignals
): WarningFinding[] {
  const findings: WarningFinding[] = [];
  const t = WARNING_THRESHOLDS;

  // Rule 1 — overdue follow-up actions
  if (s.overdueActions > 0) {
    const lowScore =
      (s.latestGrowth ?? 100) < t.mediumScore ||
      (s.latestSupervisionScore ?? 100) < t.mediumScore;
    findings.push({
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      subject: s.subject,
      type: "overdue_follow_up",
      severity: lowScore ? "high" : "medium",
      evidence: [
        `${s.overdueActions} tindak lanjut melewati tanggal target`,
      ],
      recommendation:
        "Evaluasi hambatan penyelesaian tindak lanjut bersama guru dan tetapkan target tanggal baru yang realistis.",
    });
  }

  // Rule 2 — low growth score
  if (s.latestGrowth !== null && s.latestGrowth < t.lowScore) {
    findings.push({
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      subject: s.subject,
      type: "low_growth",
      severity:
        s.latestGrowth < t.highScore
          ? "high"
          : s.latestGrowth < t.mediumScore
            ? "medium"
            : "low",
      evidence: [`Skor overall terakhir ${s.latestGrowth} (< ${t.lowScore})`],
      recommendation:
        "Jadwalkan coaching dengan fokus pada dimensi kompetensi terendah guru.",
    });
  }

  // Rule 3 — declining growth trend
  if (s.latestGrowth !== null && s.previousGrowth !== null) {
    const delta =
      Math.round((s.latestGrowth - s.previousGrowth) * 100) / 100;
    if (delta < 0) {
      findings.push({
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        subject: s.subject,
        type: "declining_growth",
        severity: "medium",
        evidence: [
          `Skor turun ${Math.abs(delta)} poin (${s.previousGrowth} → ${s.latestGrowth})`,
        ],
        recommendation:
          "Identifikasi penyebab penurunan melalui supervisi ulang atau diskusi reflektif sebelum menentukan intervensi.",
      });
    }
  }

  // Rule 4 — low supervision score
  if (
    s.latestSupervisionScore !== null &&
    s.latestSupervisionScore < t.mediumScore
  ) {
    findings.push({
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      subject: s.subject,
      type: "low_supervision_score",
      severity: s.latestSupervisionScore < t.highScore ? "high" : "medium",
      evidence: [
        `Skor supervisi terakhir ${s.latestSupervisionScore} (< ${t.mediumScore})`,
      ],
      recommendation:
        "Tindak lanjuti temuan supervisi dengan sesi coaching yang terhubung ke supervisi tersebut.",
    });
  }

  // Rule 5 — stale / missing coaching (only meaningful when other risks exist)
  const hasRisk = findings.length > 0;
  if (hasRisk) {
    if (s.daysSinceCoaching === null) {
      findings.push({
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        subject: s.subject,
        type: "stale_coaching",
        severity: "high",
        evidence: ["Belum pernah ada sesi coaching tercatat"],
        recommendation:
          "Segera jadwalkan sesi coaching pertama karena guru menunjukkan indikator risiko tanpa pendampingan.",
      });
    } else if (s.daysSinceCoaching > t.coachingStaleDays) {
      findings.push({
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        subject: s.subject,
        type: "stale_coaching",
        severity: "medium",
        evidence: [
          `Coaching terakhir ${s.daysSinceCoaching} hari lalu (> ${t.coachingStaleDays} hari)`,
        ],
        recommendation:
          "Jadwalkan coaching lanjutan agar pendampingan tidak terputus.",
      });
    }
  }

  // Rule 6 — critical escalation: multiple high-risk indicators
  const highs = findings.filter((f) => severityRank(f.severity) >= 3).length;
  const veryLowScore =
    (s.latestGrowth ?? 100) < t.highScore ||
    (s.latestSupervisionScore ?? 100) < t.highScore;
  if (highs >= 2 || (veryLowScore && s.overdueActions > 0)) {
    findings.push({
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      subject: s.subject,
      type: "critical_risk",
      severity: "critical",
      evidence: [
        "Kombinasi beberapa indikator risiko tinggi pada guru yang sama",
        ...findings.slice(0, 3).flatMap((f) => f.evidence.slice(0, 1)),
      ],
      recommendation:
        "Prioritaskan intervensi individual segera: coaching 1-on-1 dengan target terukur dan pemantauan mingguan.",
    });
  }

  return findings.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity)
  );
}
