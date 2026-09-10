import { FolderKanban } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { title: "Program", description: "Program kerja dan pengembangan sekolah" },
  { title: "Surat", description: "Arsip surat masuk dan keluar" },
  { title: "Keputusan", description: "SK dan keputusan kepala sekolah" },
  { title: "Notulen", description: "Risalah rapat dan tindak lanjutnya" },
];

export default function AdministrationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tata Usaha"
        title="Administrasi"
        description="Program, surat, keputusan, dan notulen dalam satu tempat."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Panel key={s.title} title={s.title} description={s.description}>
            <p className="text-xs text-muted-foreground">
              Dibuka pada fase berikutnya.
            </p>
          </Panel>
        ))}
      </div>
      <Empty
        icon={FolderKanban}
        title="Arsip administrasi menyusul"
        description="Tabel database untuk keempat seksi ini sudah tersedia dan siap dipakai."
      />
    </div>
  );
}
