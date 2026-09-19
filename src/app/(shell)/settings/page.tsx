import { Settings2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { getMySchool } from "@/services/school.service";
import { getMyAccount } from "@/services/profile.service";
import {
  SchoolLogoForm,
  SchoolProfileForm,
} from "@/components/settings/settings-forms";
import {
  AccountEmailForm,
  AccountNameForm,
  AccountPasswordForm,
} from "@/components/settings/account-forms";
import { Badge, Empty, PageHeader, Panel } from "@/components/common";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  principal: "Kepala Sekolah",
  teacher: "Guru",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user?.schoolId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pengaturan"
          description="Akun Anda dan identitas sekolah"
        />
        <Empty
          icon={Settings2}
          title="Belum terhubung ke sekolah"
          description="Selesaikan penyiapan akun Anda terlebih dahulu."
          actionHref="/onboarding"
          actionLabel="Buka Halaman Penyiapan"
        />
      </div>
    );
  }

  const isLeader = hasRole(user.role, "principal");
  const [account, school] = await Promise.all([
    getMyAccount().catch(() => null),
    isLeader ? getMySchool().catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pengaturan"
        title="Akun Saya"
        description="Lihat dan ubah data akun Anda: nama, email, dan kata sandi."
      />

      <Panel
        title="Data Akun"
        description="Informasi akun Anda saat ini."
      >
        {account ? (
          <dl className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nama
              </dt>
              <dd className="mt-0.5 font-semibold">{account.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </dt>
              <dd className="mt-0.5 font-semibold">{account.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Peran
              </dt>
              <dd className="mt-0.5">
                <Badge tone="info">{roleLabel(account.role)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sekolah
              </dt>
              <dd className="mt-0.5 font-semibold">{account.schoolName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Masuk dengan
              </dt>
              <dd className="mt-0.5">
                <Badge tone={account.loginWith === "google" ? "info" : "neutral"}>
                  {account.loginWith === "google" ? "Akun Google" : "Email + Kata Sandi"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd className="mt-0.5">
                <Badge tone={account.isActive ? "success" : "neutral"}>
                  {account.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Terdaftar sejak
              </dt>
              <dd className="mt-0.5 font-semibold">{formatDate(account.joinedAt)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Data akun tidak dapat dimuat. Muat ulang halaman.
          </p>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Ubah Nama"
          description="Nama tampil di seluruh aplikasi."
        >
          <AccountNameForm initialName={account?.fullName ?? ""} />
        </Panel>
        <Panel
          title="Ubah Email"
          description="Email dipakai untuk masuk."
        >
          <AccountEmailForm initialEmail={account?.email ?? ""} />
        </Panel>
      </div>

      {account?.loginWith === "google" ? (
        <Panel
          title="Kata Sandi"
          description="Akun ini masuk dengan Google."
        >
          <div className="space-y-3 text-[15px] leading-relaxed">
            <p>
              Akun Anda <strong>tidak memakai kata sandi</strong> karena masuk
              dengan tombol Google. Keamanannya mengikuti Akun Google Anda
              (termasuk verifikasi 2 langkah bila diaktifkan di sana).
            </p>
            <a
              href="https://myaccount.google.com/signinoptions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg border-2 px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-muted"
            >
              Kelola keamanan Akun Google
            </a>
          </div>
        </Panel>
      ) : (
        <Panel
          title="Ganti Kata Sandi"
          description="Minimal 6 karakter. Jangan bagikan ke siapa pun."
        >
          <AccountPasswordForm />
        </Panel>
      )}

      {isLeader && (
        <>
          <PageHeader
            title={school?.name ?? "Sekolah"}
            description="Data satuan pendidikan, pimpinan, dan identitas visual yang tampil di sidebar."
          />
          {school ? (
            <>
              <Panel
                title="Profil Satuan Pendidikan"
                description="Dapat diubah kapan saja — tersimpan ke data sekolah."
              >
                <SchoolProfileForm school={school} />
              </Panel>
              <Panel
                title="Logo Sekolah"
                description="Tampil di sidebar Kepala Sekolah dan seluruh guru."
              >
                <SchoolLogoForm school={school} />
              </Panel>
            </>
          ) : (
            <Empty
              icon={Settings2}
              title="Gagal memuat data sekolah"
              description="Periksa koneksi Anda lalu muat ulang halaman."
              actionHref="/settings"
              actionLabel="Muat Ulang"
            />
          )}
        </>
      )}
    </div>
  );
}
