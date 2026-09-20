import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncGoogleAvatarIfEmpty } from "@/services/profile.service";

/**
 * OAuth callback (Google, dll).
 * Menukar `code` menjadi session, lalu mengarahkan berdasarkan
 * kelengkapan data: belum ada profil/sekolah → /onboarding,
 * sudah lengkap → `next` (default /dashboard).
 *
 * Penting untuk production dengan custom domain:
 * - Jangan percaya buta `new URL(request.url).origin` karena di balik
 *   proxy Vercel bisa menghasilkan host `*.vercel.app` padahal user
 *   membuka custom domain. Hormati `x-forwarded-host` dan canonical
 *   `NEXT_PUBLIC_SITE_URL` bila diset.
 */
function getBaseUrl(request: Request): string {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (canonical) return canonical.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      "https";
    if (host) return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = getBaseUrl(request);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next");
  const next =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Foto Google langsung tampil di top nav tanpa upload manual.
      await syncGoogleAvatarIfEmpty();
      let dest = "/onboarding";
      try {
        const userId = data.user?.id ?? data.session?.user?.id;
        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("school_id")
            .eq("auth_user_id", userId)
            .single();
          if (profile?.school_id) dest = next;
        }
      } catch {
        dest = "/onboarding";
      }
      return NextResponse.redirect(new URL(dest, baseUrl).toString());
    }
    console.error("OAuth callback error:", error.message);
  }

  return NextResponse.redirect(
    new URL("/login?error=oauth", baseUrl).toString()
  );
}
