import type { TeacherContext, SchoolInsightContext } from "./context";
import type { AIFeature } from "./types";

export function buildCoachGuruPrompt(
  context: TeacherContext,
  question?: string
): string {
  const teacherName = context.profile.fullName;
  const subject = context.profile.subject ?? "tidak diketahui";

  let prompt = `Anda adalah SMART KASEK AI Coach, asisten untuk Kepala Sekolah dalam menganalisis dan mengembangkan kinerja guru.\n\n`;

  prompt += `## Data Guru\n`;
  prompt += `Nama: ${teacherName}\n`;
  prompt += `Mata Pelajaran: ${subject}\n`;
  if (context.profile.department) {
    prompt += `Departemen: ${context.profile.department}\n`;
  }
  if (context.profile.joinedAt) {
    prompt += `Bergabung sejak: ${context.profile.joinedAt}\n`;
  }

  if (context.competencies.length > 0) {
    prompt += `\n## Kompetensi Terkini\n`;
    context.competencies.slice(0, 5).forEach((c) => {
      prompt += `- ${c.name} (${c.category}): ${c.score}\n`;
    });
  }

  if (context.recentSupervisions.length > 0) {
    prompt += `\n## Supervisi Terakhir\n`;
    context.recentSupervisions.forEach((s) => {
      prompt += `- Tanggal: ${s.date}, Skor: ${s.overallScore ?? "-"}, Status: ${s.status}\n`;
      if (s.strengths) prompt += `  Kekuatan: ${s.strengths}\n`;
      if (s.improvements) prompt += `  Perlu ditingkatkan: ${s.improvements}\n`;
    });
  }

  if (context.recentCoaching.length > 0) {
    prompt += `\n## Coaching Terakhir\n`;
    context.recentCoaching.slice(0, 3).forEach((c) => {
      prompt += `- Tanggal: ${c.date}, Fokus: ${c.focusArea ?? "-"}\n`;
      if (c.actions.length > 0) {
        const pending = c.actions.filter(
          (a) => a.status === "pending" || a.status === "in_progress"
        ).length;
        const completed = c.actions.filter(
          (a) => a.status === "completed"
        ).length;
        prompt += `  Tindakan: ${completed} selesai, ${pending} pending\n`;
      }
    });
  }

  if (context.growthHistory.length > 0) {
    prompt += `\n## Riwayat Perkembangan\n`;
    context.growthHistory.forEach((g) => {
      prompt += `- ${g.period}: Overall ${g.overallScore ?? "-"}, Pedagogik ${g.pedagogicScore ?? "-"}, Asesmen ${g.assessmentScore ?? "-"}\n`;
    });
  }

  if (question) {
    prompt += `\n## Pertanyaan Kepala Sekolah\n${question}\n`;
  }

  prompt += `\n## Instruksi\n`;
  prompt += `Berikan analisis dalam format JSON dengan struktur berikut:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "Ringkasan kondisi guru (2-3 kalimat)",\n`;
  prompt += `  "strengths": ["Kekuatan 1", "Kekuatan 2"],\n`;
  prompt += `  "areas": ["Area yang perlu ditingkatkan 1", "Area 2"],\n`;
  prompt += `  "priority": "low|medium|high|critical",\n`;
  prompt += `  "recommendations": ["Rekomendasi 1", "Rekomendasi 2"],\n`;
  prompt += `  "suggested_actions": [{"action": "Tindakan spesifik", "target_days": 14}]\n`;
  prompt += `}\n\n`;
  prompt += `Aturan wajib:\n`;
  prompt += `- Bedakan FAKTA (angka/kejadian dari data di atas), INFERENSI (dugaan berdasarkan pola data), dan REKOMENDASI (saran tindakan).\n`;
  prompt += `- Fakta harus berdasarkan data di atas. Jangan mengarang angka atau data yang tidak ada.\n`;
  prompt += `- Jika suatu bagian data kosong (mis. belum ada supervisi atau coaching), tulis terus terang "data belum tersedia" di summary dan jangan membuat kesimpulan dari data kosong tersebut.\n`;
  prompt += `- Rekomendasi bersifat bahan pertimbangan Kepala Sekolah, bukan keputusan final.\n`;

  return prompt;
}

export function buildSchoolInsightPrompt(context: SchoolInsightContext): string {
  let prompt = `Anda adalah SMART KASEK AI School Insight, asisten analisis untuk Kepala Sekolah.\n\n`;

  prompt += `## Data Sekolah\n`;
  prompt += `Jumlah Guru: ${context.teacherCount}\n`;
  prompt += `Rata-rata Perkembangan: ${context.averageGrowth ?? "Belum ada data"}\n`;

  prompt += `\n## Statistik Supervisi\n`;
  prompt += `Total Supervisi: ${context.supervisionStats.total}\n`;
  prompt += `Selesai: ${context.supervisionStats.completed}\n`;
  prompt += `Rata-rata Skor: ${context.supervisionStats.averageScore ?? "Belum ada data"}\n`;

  if (context.competencyAverages.length > 0) {
    prompt += `\n## Rata-rata Kompetensi\n`;
    context.competencyAverages.forEach((c) => {
      prompt += `- ${c.name} (${c.category}): ${c.averageScore}\n`;
    });
  }

  if (context.recentWarnings.length > 0) {
    prompt += `\n## Peringatan Aktif\n`;
    context.recentWarnings.forEach((w) => {
      prompt += `- ${w.teacherName}: ${w.type} (Severity: ${w.severity})\n`;
    });
  }

  prompt += `\n## Instruksi\n`;
  prompt += `Berikan insight dalam format JSON:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "Insight utama tentang kondisi sekolah",\n`;
  prompt += `  "strengths": ["Kekuatan sekolah"],\n`;
  prompt += `  "areas": ["Area prioritas yang perlu ditingkatkan"],\n`;
  prompt += `  "priority": "low|medium|high|critical",\n`;
  prompt += `  "recommendations": ["Rekomendasi program"],\n`;
  prompt += `  "suggested_actions": [{"action": "Tindakan prioritas", "target_days": 30}]\n`;
  prompt += `}\n\n`;
  prompt += `Fokus pada area yang paling membutuhkan perhatian berdasarkan data.`;

  return prompt;
}

export function buildEarlyWarningPrompt(context: SchoolInsightContext): string {
  let prompt = `Anda adalah SMART KASEK Early Warning System.\n\n`;

  prompt += `## Data Sekolah\n`;
  prompt += `Jumlah Guru: ${context.teacherCount}\n`;
  prompt += `Rata-rata Perkembangan: ${context.averageGrowth ?? "Belum ada data"}\n`;

  if (context.competencyAverages.length > 0) {
    prompt += `\n## Kompetensi di Bawah Rata-rata\n`;
    context.competencyAverages
      .filter((c) => c.averageScore < 70)
      .forEach((c) => {
        prompt += `- ${c.name}: ${c.averageScore}\n`;
      });
  }

  if (context.recentWarnings.length > 0) {
    prompt += `\n## Peringatan Aktif\n`;
    context.recentWarnings.forEach((w) => {
      prompt += `- ${w.teacherName}: ${w.type} (${w.severity})\n`;
    });
  }

  prompt += `\n## Instruksi\n`;
  prompt += `Identifikasi guru yang membutuhkan perhatian khusus dalam format JSON:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "Ringkasan kondisi early warning",\n`;
  prompt += `  "strengths": ["Aspek yang baik"],\n`;
  prompt += `  "areas": ["Area berisiko"],\n`;
  prompt += `  "priority": "low|medium|high|critical",\n`;
  prompt += `  "recommendations": ["Rekomendasi tindakan"],\n`;
  prompt += `  "suggested_actions": [{"action": "Tindakan segera", "target_days": 7}]\n`;
  prompt += `}\n\n`;
  prompt += `Fokus pada guru dengan skor rendah, supervisi stagnan, atau tanpa coaching terbaru.`;

  return prompt;
}

export function buildPrompt(
  feature: AIFeature,
  context: TeacherContext | SchoolInsightContext,
  question?: string
): string {
  switch (feature) {
    case "coach":
      return buildCoachGuruPrompt(context as TeacherContext, question);
    case "school_insight":
      return buildSchoolInsightPrompt(context as SchoolInsightContext);
    case "early_warning":
      return buildEarlyWarningPrompt(context as SchoolInsightContext);
    case "assistant":
    default:
      return buildSchoolInsightPrompt(context as SchoolInsightContext);
  }
}

/**
 * AI explains ONE deterministic rule finding (AGENTS.md §17).
 * Severity is already fixed by the rule engine and must NOT be changed.
 */
export function buildWarningExplanationPrompt(finding: {
  teacherName: string;
  subject: string | null;
  type: string;
  severity: string;
  evidence: string[];
  recommendation: string;
}): string {
  let prompt = `Anda adalah SMART KASEK Early Warning Explainer. Tugas Anda HANYA menjelaskan temuan aturan di bawah ini dengan bahasa yang mudah dipahami Kepala Sekolah.\n\n`;
  prompt += `## Temuan Sistem (sudah pasti, JANGAN diubah)\n`;
  prompt += `Guru: ${finding.teacherName}${finding.subject ? ` (${finding.subject})` : ""}\n`;
  prompt += `Jenis: ${finding.type}\n`;
  prompt += `Tingkat prioritas (ditentukan sistem, JANGAN diubah): ${finding.severity}\n`;
  prompt += `Bukti:\n`;
  finding.evidence.forEach((e) => {
    prompt += `- ${e}\n`;
  });
  prompt += `Rekomendasi awal sistem: ${finding.recommendation}\n`;
  prompt += `\n## Instruksi\n`;
  prompt += `Jelaskan MENGAPA temuan ini penting dan jabarkan langkah coaching konkret dalam format JSON:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "Penjelasan 2-3 kalimat tentang temuan ini",\n`;
  prompt += `  "strengths": ["Hal positif yang masih dimiliki guru jika ada"],\n`;
  prompt += `  "areas": ["Area risiko dari bukti di atas"],\n`;
  prompt += `  "priority": "${finding.severity}",\n`;
  prompt += `  "recommendations": ["Langkah coaching konkret"],\n`;
  prompt += `  "suggested_actions": [{"action": "Tindakan spesifik", "target_days": 7}]\n`;
  prompt += `}\n\n`;
  prompt += `Aturan wajib: field "priority" HARUS "${finding.severity}". Jangan menambah fakta di luar bukti di atas; jika perlu asumsi, tandai sebagai inferensi dalam kalimat.`;

  return prompt;
}
