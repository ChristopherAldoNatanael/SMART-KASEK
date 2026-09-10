import { Users } from "lucide-react";
import { Empty, PageHeader } from "@/components/common";

export const dynamic = "force-dynamic";

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kesiswaan"
        title="Peserta Didik"
        description="Data siswa sebagai konteks pendukung insight sekolah."
      />
      <Empty
        icon={Users}
        title="Modul kesiswaan dalam persiapan"
        description="Struktur data siswa sudah siap di database. Modul ini dibuka setelah alur inti supervisi → coaching → growth stabil."
      />
    </div>
  );
}
