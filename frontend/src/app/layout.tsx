import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth.context";
import { ThemeProvider } from "@/contexts/theme.context";
import { LocaleProvider } from "@/contexts/locale.context";
import { ToastProvider } from "@/components/toast";
import { ThemeScript } from "@/components/theme-script";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LearnStream",
  description: "Your professional learning platform",
};

const messageMap = { en, pt } as const;
type Locale = keyof typeof messageMap;

function resolveLocale(raw: string | undefined): Locale {
  if (raw === 'en' || raw === 'pt') return raw;
  return 'en';
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get('NEXT_LOCALE')?.value);
  const messages = messageMap[locale];

  return (
    <html
      lang={locale}
      className={`${poppins.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeScript />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleProvider locale={locale}>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>{children}</ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
