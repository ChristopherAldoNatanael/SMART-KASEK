import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Public endpoint for launch-day monitoring & warm-up.
// NEVER echo secret values — only presence (true/false) and bucket names.
const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_BASE_URL",
  "AI_API_KEY",
] as const;

// Optional: only enables the storage-bucket verification below.
// The app itself runs on the anon key + RLS and does not need it.
const OPTIONAL_ENV = ["SUPABASE_SERVICE_ROLE_KEY"] as const;

const EXPECTED_BUCKETS = [
  "school-logos",
  "lesson-docs",
  "supervision-docs",
  "coaching-evidence",
];

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() =>
    clearTimeout(timer)
  );
}

export async function GET() {
  const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);

  let database: "ok" | "error" | "skipped" = "skipped";
  let databaseDetail: string | null = null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Database reachability (anon ping; RLS may return 0 rows — that's OK).
  if (url && anonKey) {
    try {
      const anon = createClient(url, anonKey);
      const { error } = await withTimeout(
        anon.from("schools").select("id", { head: true, count: "exact" }),
        8000
      );
      if (error) {
        database = "error";
        databaseDetail = error.message;
      } else {
        database = "ok";
      }
    } catch (error) {
      database = "error";
      databaseDetail =
        error instanceof Error ? error.message : "Unknown database error";
    }
  }

  // 2. Storage buckets (detects unapplied migrations in production).
  let buckets: "ok" | "error" | "skipped" = "skipped";
  let bucketsMissing: string[] = [];
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey);
      const { data, error } = await withTimeout(
        admin.storage.listBuckets(),
        8000
      );
      if (error) {
        buckets = "error";
      } else {
        const names = new Set((data ?? []).map((b) => b.name));
        bucketsMissing = EXPECTED_BUCKETS.filter((b) => !names.has(b));
        buckets = bucketsMissing.length === 0 ? "ok" : "error";
      }
    } catch {
      buckets = "error";
    }
  }

  const warnings = OPTIONAL_ENV.filter((k) => !process.env[k]).map(
    (k) => `${k} tidak diisi - verifikasi bucket dilewati`
  );

  const healthy =
    missingEnv.length === 0 && database === "ok" && buckets !== "error";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        env: { missing: missingEnv },
        database: { status: database, detail: databaseDetail },
        buckets: { status: buckets, missing: bucketsMissing },
      },
      warnings,
    },
    { status: healthy ? 200 : 503 }
  );
}
