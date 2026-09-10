import { getAuditLogs, getAuditStats } from "@/services/audit.service";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  create: "Buat",
  update: "Perbarui",
  delete: "Hapus",
  login: "Masuk",
  logout: "Keluar",
  view: "Lihat",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-purple-100 text-purple-700",
  logout: "bg-gray-100 text-gray-700",
  view: "bg-yellow-100 text-yellow-700",
};

export default async function AuditLogPage() {
  const [logs, stats] = await Promise.all([
    getAuditLogs(50),
    getAuditStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">
          Riwayat aktivitas pengguna di sekolah
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Total Aksi
          </p>
          <p className="text-2xl font-bold">{stats.totalActions}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Aksi Hari Ini
          </p>
          <p className="text-2xl font-bold">{stats.todayActions}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Jumlah Entitas
          </p>
          <p className="text-2xl font-bold">
            {Object.keys(stats.entityCounts).length}
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Belum ada aktivitas tercatat</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Waktu
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Pengguna
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Aksi
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Entitas
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.user?.full_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.entity}
                      {log.entity_id && (
                        <span className="text-muted-foreground">
                          {" "}
                          (#{log.entity_id.slice(0, 8)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
