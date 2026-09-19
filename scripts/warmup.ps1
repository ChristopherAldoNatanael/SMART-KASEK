# =====================================================
# SMART KASEK — Pemanasan pra-presentasi (lawan cold start
# Vercel + Supabase free-tier yang "tertidur").
# Cara pakai (jalankan dari folder proyek):
#   powershell -ExecutionPolicy Bypass -File scripts\warmup.ps1 -BaseUrl https://domain-anda.vercel.app
# Jalankan H-1 (bangunkan Supabase) dan 30 menit sebelum tampil.
# =====================================================
param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot
$Base = $BaseUrl.TrimEnd("/")

Write-Host "Pemanasan → $Base" -ForegroundColor Cyan
Write-Host ""

# 1. Smoke test dulu (gagal = berhenti, perbaiki dulu).
if (Get-Command node -ErrorAction SilentlyContinue) {
  Write-Host "[1/3] Smoke test..." -ForegroundColor Yellow
  node scripts\smoke.mjs $Base
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Smoke test GAGAL — hentikan pemanasan, perbaiki dulu." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "node tidak ditemukan — lewati smoke test otomatis." -ForegroundColor Yellow
}

# 2. Bangunkan Supabase yang tertidur (3x dengan jeda).
Write-Host ""
Write-Host "[2/3] Membangunkan database (3x ping)..." -ForegroundColor Yellow
for ($i = 1; $i -le 3; $i++) {
  try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-WebRequest -Uri "$Base/api/health" -UseBasicParsing -TimeoutSec 60
    $sw.Stop()
    $status = ($res.Content | ConvertFrom-Json).status
    Write-Host ("  Ping {0}: HTTP {1}, {2} ms, status={3}" -f $i, $res.StatusCode, [int]$sw.Elapsed.TotalMilliseconds, $status)
  } catch {
    Write-Host ("  Ping {0}: GAGAL — {1}" -f $i, $_.Exception.Message) -ForegroundColor Red
  }
  if ($i -lt 3) { Start-Sleep -Seconds 5 }
}

# 3. Hangatkan halaman publik (bunuh cold start Vercel).
Write-Host ""
Write-Host "[3/3] Menghangatkan halaman..." -ForegroundColor Yellow
foreach ($path in @("/", "/login", "/register")) {
  try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-WebRequest -Uri "$Base$path" -UseBasicParsing -TimeoutSec 60
    $sw.Stop()
    Write-Host ("  {0}: HTTP {1}, {2} ms" -f $path, $res.StatusCode, [int]$sw.Elapsed.TotalMilliseconds)
  } catch {
    Write-Host ("  {0}: GAGAL — {1}" -f $path, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Pemanasan selesai. Pengingat manual H-1:" -ForegroundColor Green
Write-Host "  1. Buka dashboard Supabase — pastikan project TIDAK paused."
Write-Host "  2. Vercel > Deployments = sukses; semua env production terisi (pakai scripts\push-env.ps1)."
Write-Host "  3. Login manual sebagai Kepsek + Guru; klik Dashboard, Supervisi, Coaching, Siswa."
Write-Host "  4. Coba 1x generate AI (Coach/Insight) — pastikan kuota API masih ada."
Write-Host "  5. Siapkan screenshot cadangan bila internet venue bermasalah."
