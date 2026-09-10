/**
 * Pure growth-calculation helpers (no server dependencies).
 * Used by src/services/growth.service.ts.
 */

export type GrowthScores = {
  pedagogicScore: number | null;
  professionalScore: number | null;
  socialScore: number | null;
  personalityScore: number | null;
  digitalScore: number | null;
  assessmentScore: number | null;
  classroomScore: number | null;
};

/**
 * Current school semester label, e.g. "2026-Ganjil".
 * Convention (documented assumption, AGENTS.md §45):
 * July–December = semester Ganjil, January–June = semester Genap.
 * Matches the seed-demo.sql period format ("2024-Ganjil").
 */
export function getCurrentPeriod(date = new Date()): string {
  const year = date.getFullYear();
  const semester = date.getMonth() >= 6 ? "Ganjil" : "Genap";
  return `${year}-${semester}`;
}

/**
 * Map a competency master name to a snapshot dimension column.
 * Returns null when the competency has no growth dimension.
 */
export function dimensionColumnFor(name: string): keyof GrowthScores | null {
  const n = name.toLowerCase();
  if (n.includes("pedagog")) return "pedagogicScore";
  if (n.includes("profesional") || n.includes("professional"))
    return "professionalScore";
  if (n.includes("sosial") || n.includes("social")) return "socialScore";
  if (n.includes("kepribadian") || n.includes("personality"))
    return "personalityScore";
  if (n.includes("digital") || n.includes("teknologi")) return "digitalScore";
  if (n.includes("asesmen") || n.includes("assess")) return "assessmentScore";
  if (n.includes("kelas") || n.includes("classroom")) return "classroomScore";
  return null;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}
