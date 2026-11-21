import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jimpit Kulon — Jimpitan Warga Dusun Ngowan RT 1 RW 2",
    template: "%s | Jimpit Kulon",
  },
  description:
    "Aplikasi transparansi dan pencatatan dana jimpitan warga Dusun Ngowan RT 1 RW 2 yang dikelola oleh Pemuda-Pemudi Tunas Manunggal.",
  applicationName: "Jimpit Kulon",
  authors: [{ name: "Pemuda Tunas Manunggal" }],
  creator: "Pemuda Tunas Manunggal Ngowan",
  keywords: [
    "Jimpitan",
    "Jimpit Kulon",
    "Dusun Ngowan",
    "RT 1 RW 2",
    "Pemuda Tunas Manunggal",
    "Kas Jimpitan",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "Jimpit Kulon",
    title: "Jimpit Kulon — Jimpitan Warga Dusun Ngowan RT 1 RW 2",
    description:
      "Aplikasi transparansi dan pencatatan dana jimpitan warga Dusun Ngowan RT 1 RW 2 yang dikelola oleh Pemuda-Pemudi Tunas Manunggal.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Jimpit Kulon — Dusun Ngowan RT 1 RW 2",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jimpit Kulon — Jimpitan Warga Dusun Ngowan RT 1 RW 2",
    description:
      "Aplikasi transparansi dan pencatatan dana jimpitan warga Dusun Ngowan RT 1 RW 2 yang dikelola oleh Pemuda-Pemudi Tunas Manunggal.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
