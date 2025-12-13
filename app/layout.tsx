import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider-nextauth";
import { EnvChecker } from "@/components/env-checker";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "T-AI-LOR - AI-Powered Resume Tailoring",
  description: "Tailor your resume to every job in minutes — powered by AI. Upload your resume, paste any job description, and get a perfectly tailored resume in seconds.",
  keywords: ["resume", "AI", "job application", "resume builder", "career", "tailored resume", "job search"],
  authors: [{ name: "T-AI-LOR" }],
  creator: "T-AI-LOR",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tailor.app"),
  
  // Favicon and icons
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  
  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "T-AI-LOR",
    title: "T-AI-LOR - AI-Powered Resume Tailoring",
    description: "Tailor your resume to every job in minutes — powered by AI. Get past ATS filters and land more interviews.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "T-AI-LOR - AI-Powered Resume Tailoring",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "T-AI-LOR - AI-Powered Resume Tailoring",
    description: "Tailor your resume to every job in minutes — powered by AI. Get past ATS filters and land more interviews.",
    images: ["/og-image.png"],
    creator: "@tailor_ai",
  },
  
  // Apple mobile web app
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "T-AI-LOR",
  },
  
  // Other metadata
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1419" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <EnvChecker />
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

