import Link from "next/link";
import { UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getTeachers } from "@/services/teacher.service";
import TeacherActiveToggle from "@/components/teachers/teacher-active-toggle";
import {
  Badge,
  Empty,
  PageHeader,
  TableHead,
  TableShell,
  Th,
} from "@/components/common";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const [user, teachers] = await Promise.all([
    getCurrentUser(),
    getTeachers(),
  ]);
  const canManage = user !== null && hasRole(user.role, "principal");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Pokok"
        title="Guru"
        description={`${teachers.length} guru terdaftar di sekolah Anda.`}
      />

      {teachers.length === 0 ? (
        <Empty
          icon={UserRound}
          title="Belum ada data guru"
          description="Guru bergabung melalui kode undangan di dashboard, atau tambahkan manual."
        />
      ) : (
        <TableShell>
          <TableHead>
            <Th>Nama</Th>
            <Th>Mata Pelajaran</Th>
            <Th>Wali Kelas</Th>
            <Th>NIP</Th>
            <Th>Status</Th>
            <Th className="text-right">Aksi</Th>
          </TableHead>
          <tbody>
            {teachers.map((teacher) => (
              <tr
                key={teacher.id}
                className="border-b transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="px-4 py-3">
                  <p className="font-medium leading-tight">
                    {teacher.profile?.full_name ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {teacher.profile?.email ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {teacher.subject ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {teacher.homeroom_class ? (
                    <Badge tone="brand">{teacher.homeroom_class}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="tnum px-4 py-3 text-muted-foreground">
                  {teacher.nip ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={teacher.profile?.is_active ? "success" : "neutral"}>
                    {teacher.profile?.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/teachers/${teacher.id}`}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Lihat
                    </Link>
                    {canManage && (
                      <TeacherActiveToggle
                        teacherId={teacher.id}
                        isActive={teacher.profile?.is_active ?? false}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
