# =====================================================
# Upload SEMUA env dari .env.local ke Vercel sekaligus.
# Cara pakai (jalankan dari folder proyek):
#   powershell -ExecutionPolicy Bypass -File scripts\push-env.ps1
# Opsi: scripts\push-env.ps1 -Env production|preview|development (default: production)
# Catatan: .env.local TIDAK di-commit; yang dikirim hanya nilainya
# via koneksi resmi Vercel CLI (tersimpan terenkripsi di Vercel).
# =====================================================
param(
  [ValidateSet("production", "preview", "development")]
  [string]$Env = "production"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

# 1. Vercel CLI
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Host "Vercel CLI belum ada - menginstal..." -ForegroundColor Yellow
  npm install -g vercel
}

# 2. Login (browser, sekali saja per mesin)
try {
  vercel whoami | Out-Null
} catch {
  Write-Host "Membuka login Vercel di browser..." -ForegroundColor Yellow
  vercel login
}

# 3. Hubungkan folder ke project (lewati bila sudah terhubung)
if (-not (Test-Path -LiteralPath ".vercel")) {
  Write-Host "Menghubungkan folder ke project Vercel..." -ForegroundColor Yellow
  vercel link
}

# 4. Baca .env.local (abaikan komentar dan baris kosong)
$envFile = Join-Path $ProjectRoot ".env.local"
if (-not (Test-Path -LiteralPath $envFile)) {
  throw ".env.local tidak ditemukan di $ProjectRoot"
}

$entries = @()
foreach ($line in (Get-Content -LiteralPath $envFile)) {
  $t = $line.Trim()
  if (-not $t) { continue }
  if ($t.StartsWith("#")) { continue }
  $idx = $t.IndexOf("=")
  if ($idx -lt 1) { continue }
  $entries += [pscustomobject]@{
    Key   = $t.Substring(0, $idx).Trim()
    Value = $t.Substring($idx + 1).Trim()
  }
}

if ($entries.Count -eq 0) { throw "Tidak ada env di .env.local" }

Write-Host ("Mengupload " + $entries.Count + " env ke [" + $Env + "]...") -ForegroundColor Cyan

# 5. Upload satu per satu (timpa bila sudah ada)
foreach ($e in $entries) {
  Write-Host ("  " + $e.Key + " ...") -NoNewline
  $keyName = $e.Key
  $keyValue = $e.Value
  $ok = $true
  try {
    vercel env rm $keyName $Env --yes 2>$null | Out-Null
  } catch { }
  try {
    $keyValue | vercel env add $keyName $Env 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { $ok = $false }
  } catch {
    $ok = $false
  }
  if ($ok) {
    Write-Host " OK" -ForegroundColor Green
  } else {
    Write-Host " GAGAL" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Selesai. PENTING:" -ForegroundColor Yellow
Write-Host "1. Buka Vercel > Deployments > Redeploy (tanpa cache) agar NEXT_PUBLIC_* terbaca."
Write-Host "2. Pastikan Supabase Redirect URLs memuat domain produksi + /auth/callback."
