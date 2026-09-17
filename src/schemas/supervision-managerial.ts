import { z } from "zod";
import {
  MANAGERIAL_I1_ITEMS,
  MANAGERIAL_I2_ITEMS,
  MANAGERIAL_I3_ITEMS,
} from "@/lib/supervision-managerial";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().min(1).max(max).optional()
  );

const I1_KEYS = MANAGERIAL_I1_ITEMS.map((i) => i.key) as [string, ...string[]];
const I2_KEYS = MANAGERIAL_I2_ITEMS.map((i) => i.key) as [string, ...string[]];
const I3_KEYS = MANAGERIAL_I3_ITEMS.map((i) => i.key) as [string, ...string[]];

const scoreItemSchema = (keys: [string, ...string[]]) =>
  z.object({
    key: z.enum(keys),
    score: z.number().int().min(1).max(4).nullable(),
    note: z.string().trim().max(2000).optional(),
  });

const binaryItemSchema = (keys: [string, ...string[]]) =>
  z.object({
    key: z.enum(keys),
    present: z.boolean().nullable(),
    note: z.string().trim().max(2000).optional(),
  });

function itemsJson<T extends z.ZodTypeAny>(item: T, max: number) {
  return z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return [];
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    },
    z.array(item).max(max)
  );
}

export const scheduleManagerialSchema = z.object({
  teacherId: z.string().regex(UUID_RE, "Guru tidak valid"),
  supervisionDate: z.string().regex(DATE_RE, "Tanggal supervisi tidak valid"),
  academicYear: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default("2026/2027"),
  period: optionalText(60),
});

export type ScheduleManagerialInput = z.infer<typeof scheduleManagerialSchema>;

export const saveManagerialI1Schema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  itemsJson: itemsJson(scoreItemSchema(I1_KEYS), 13),
});

export const saveManagerialI2Schema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  itemsJson: itemsJson(binaryItemSchema(I2_KEYS), 10),
});

export const saveManagerialI3Schema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  itemsJson: itemsJson(scoreItemSchema(I3_KEYS), 11),
});

export const finalizeManagerialInstrumentSchema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  instrument: z.enum(["i1", "i2", "i3"]),
  itemsJson: z.string().optional().default("[]"),
});

export const saveManagerialFollowUpSchema = z.object({
  supervisionId: z.string().regex(UUID_RE, "Supervisi tidak valid"),
  findings: optionalText(5000),
  supervisorNotes: optionalText(5000),
  followUpRecommendation: optionalText(5000),
  improvementTarget: optionalText(2000),
  followUpStatus: z
    .enum(["none", "planned", "in_progress", "completed"])
    .optional()
    .default("none"),
});

export function firstManagerialIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
