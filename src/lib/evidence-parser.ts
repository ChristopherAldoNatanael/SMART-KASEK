/**
 * Client-side utility untuk parse evidence dari database.
 * Versi sync dari parseEvidence di coaching-evidence.service.ts
 */

export type EvidenceType = "text" | "link" | "file";

export type EvidenceData = {
  type: EvidenceType;
  value: string;
  fileName?: string;
};

/**
 * Parse evidence dari database (string JSON) ke EvidenceData.
 * Support legacy data (plain string).
 */
export function parseEvidence(raw: string | null): EvidenceData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      "value" in parsed
    ) {
      return parsed as EvidenceData;
    }
    // Legacy data: plain string
    return { type: "text", value: raw };
  } catch {
    // Legacy data: plain string
    return { type: "text", value: raw };
  }
}
