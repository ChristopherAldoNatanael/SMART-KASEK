// =====================================================
// SMART KASEK — Smoke test pra-launch (tanpa dependensi baru).
// Cara pakai:
//   node scripts/smoke.mjs https://domain-produksi-anda.vercel.app
//   BASE_URL=https://... npm run smoke
// Keluar dengan kode 1 bila ada pemeriksaan yang GAGAL.
// =====================================================

const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const results = [];

function report(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "  PASS" : "  GAGAL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function checkPublicPage(path) {
  try {
    const res = await fetch(`${base}${path}`);
    report(`GET ${path}`, res.status === 200, `HTTP ${res.status}`);
  } catch (error) {
    report(`GET ${path}`, false, error instanceof Error ? error.message : String(error));
  }
}

async function checkRedirectToLogin(path) {
  try {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    const pass = res.status >= 300 && res.status < 400 && location.includes("/login");
    report(`GET ${path} (tanpa login → /login)`, pass, `HTTP ${res.status} → ${location || "-"}`);
  } catch (error) {
    report(`GET ${path} (tanpa login → /login)`, false, error instanceof Error ? error.message : String(error));
  }
}

async function checkHealth() {
  try {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    const pass = res.status === 200 && body.status === "ok";
    const detail = pass
      ? "env + database + buckets OK"
      : `HTTP ${res.status}: ${JSON.stringify(body.checks ?? body)}`;
    report("GET /api/health", pass, detail);
  } catch (error) {
    report("GET /api/health", false, error instanceof Error ? error.message : String(error));
  }
}

console.log(`Smoke test → ${base}\n`);

await checkHealth();
await checkPublicPage("/");
await checkPublicPage("/login");
await checkPublicPage("/register");
await checkRedirectToLogin("/dashboard");
await checkRedirectToLogin("/onboarding");
await checkRedirectToLogin("/students");

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} lolos.`);

if (failed > 0) {
  console.log("Ada pemeriksaan GAGAL — jangan launching sebelum diperbaiki.");
  process.exit(1);
}
console.log("Siap lanjut ke pemanasan (scripts\\warmup.ps1).");
