import type { Metadata } from "next";
import { Be_Vietnam_Pro, Montserrat } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Đuổi hình bắt chữ",
  description: "Mini game Đuổi hình bắt chữ cho 4 đội",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnam.variable} ${montserrat.variable} min-h-screen bg-nab-background text-nab-foreground antialiased`}
      >
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <main className="w-full max-w-7xl">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
