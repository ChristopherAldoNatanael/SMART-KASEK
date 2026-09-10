import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getOnboardingState } from "@/services/school.service";
import {
  CreateSchoolForm,
  JoinSchoolForm,
  RolePickerForm,
} from "@/components/onboarding/onboarding-forms";

export const dynamic = "force-dynamic";

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 shadow-sm">
            <GraduationCap className="h-6 w-6 text-white" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          SMART KASEK • School Management, Administration, Reflection & Teacher
          Growth
        </p>
      </div>
    </main>
  );
}

export default async function OnboardingPage() {
  const state = await getOnboardingState();

  if (state.status === "ready") {
    redirect("/dashboard");
  }

  if (state.status === "error") {
    return (
      <Shell title="Gagal memuat data sekolah" description={state.message}>
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            Periksa koneksi internet Anda, lalu coba lagi. Ini masalah teknis,
            bukan masalah akun Anda.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
          >
            Coba Lagi
          </Link>
        </div>
      </Shell>
    );
  }

  if (state.status === "no_profile") {
    return (
      <Shell
        title="Selamat datang di SMART KASEK"
        description="Pilih peran Anda untuk mulai menggunakan aplikasi."
      >
        <RolePickerForm />
      </Shell>
    );
  }

  // needs_school — dibedakan per peran, tanpa menyebut admin.
  if (state.role === "principal" || state.role === "admin") {
    return (
      <Shell
        title="Siapkan sekolah Anda"
        description="Tambahkan informasi sekolah untuk mulai mengelola guru dan pembelajaran."
      >
        <CreateSchoolForm />
      </Shell>
    );
  }

  return (
    <Shell
      title="Belum terhubung ke sekolah"
      description="Untuk mulai menggunakan SMART KASEK, bergabunglah ke sekolah Anda menggunakan kode undangan yang diberikan oleh Kepala Sekolah."
    >
      <JoinSchoolForm />
    </Shell>
  );
}
