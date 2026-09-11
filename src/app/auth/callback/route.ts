import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback (Google, dll).
 * Menukar `code` menjadi session, lalu mengarahkan berdasarkan
 * kelengkapan data: belum ada profil/sekolah → /onboarding,
 * sudah lengkap → `next` (default /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requested = searchParams.get("next");
  const next =
    requested && requested.startsWith("/") ? requested : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
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
      return NextResponse.redirect(`${origin}${dest}`);
    }
    console.error("OAuth callback error:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
