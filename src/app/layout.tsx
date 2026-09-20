import type { Metadata } from "next";
import "./globals.css";

/**
 * Canonical publik. Crawler WhatsApp/Telegram/X HANYA menerima URL absolut
 * (https://...) untuk og:image — path relatif selalu gagal di WhatsApp.
 * Env didahulukan; fallback domain production agar build tanpa env pun
 * tetap menghasilkan tag absolut yang valid.
 */
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://smart-kasek.vercel.app"
).replace(/\/+$/, "");
const ogImageUrl = `${siteUrl}/og-image.jpg`;
const siteTitle = "SMART KASEK";
const siteDescription =
  "Platform Kepala Sekolah: kelola data sekolah, absensi QR, supervisi, coaching, dan insight berbasis data untuk teacher growth.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s • ${siteTitle}`,
  },
  description: siteDescription,
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        type: "image/jpeg",
        width: 1200,
        height: 630,
        alt: "SMART KASEK - Kelola Sekolah, Bina Guru, Absensi QR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
