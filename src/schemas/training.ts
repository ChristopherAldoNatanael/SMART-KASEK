import { z } from "zod";

/**
 * Zod schemas untuk sertifikasi guru (data profil di teachers,
 * dikelola Kepala Sekolah) dan kegiatan pelatihan Teacher Growth.
 */

export const CERTIFICATION_STATUS = ["belum", "sudah"] as const;

const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      if (v == null) return undefined;
      if (typeof v !== "string" || v.trim() === "") return undefined;
      return v.trim();
    },
    z.string().trim().max(max).optional()
  );

export const updateCertificationSchema = z
  .object({
    teacherId: z.string().uuid("Guru tidak valid"),
    status: z.enum(CERTIFICATION_STATUS, {
      error: "Status sertifikasi tidak valid",
    }),
    // Diketik manual oleh Kepala Sekolah (sistem tidak menentukan otomatis).
    type: optionalText(150),
    year: z.preprocess(
      (v) => {
        if (v == null) return undefined;
        if (typeof v === "number") return v;
        if (typeof v !== "string" || v.trim() === "") return undefined;
        const n = Number(v);
        return Number.isNaN(n) ? v : n;
      },
      z.number().int().min(1945).max(2100).optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.status === "sudah" && !data.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "Jenis sertifikasi wajib diisi untuk guru bersertifikat",
      });
    }
  });

export type UpdateCertificationInput = z.infer<
  typeof updateCertificationSchema
>;

const teacherIdArray = z.preprocess(
  (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v !== "") return [v];
    return v;
  },
  z
    .array(z.string().uuid("Guru peserta tidak valid"))
    .min(1, "Pilih minimal satu guru peserta")
    .max(200, "Terlalu banyak peserta")
);

export const trainingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama pelatihan minimal 3 karakter")
    .max(200, "Nama pelatihan maksimal 200 karakter"),
  description: optionalText(2000),
  organizer: optionalText(150),
  trainingDate: z.preprocess(
    (v) =>
      v == null || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
      .optional()
  ),
  scheduleTime: optionalText(50),
  location: optionalText(150),
  // Durasi dalam JP/jam — opsional, desimal diperbolehkan (mis. 8 / 7.5).
  durationHours: z.preprocess(
    (v) => {
      if (v == null) return undefined;
      if (typeof v === "number") return v;
      if (typeof v !== "string" || v.trim() === "") return undefined;
      const n = Number(v.replace(",", "."));
      return Number.isNaN(n) ? v : n;
    },
    z.number().min(0).max(10000).optional()
  ),
  // Poin dimasukkan sekali per kegiatan, bukan per guru.
  points: z.preprocess(
    (v) => {
      if (v == null || v === "") return 0;
      if (typeof v === "number") return Math.trunc(v);
      const n = Number(v);
      return Number.isNaN(n) ? v : Math.trunc(n);
    },
    z.number().int().min(0).max(100000)
  ),
  teacherIds: teacherIdArray,
});

export type TrainingInput = z.infer<typeof trainingSchema>;

export const trainingIdSchema = z.object({
  trainingId: z.string().uuid("Pelatihan tidak valid"),
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid";
}
