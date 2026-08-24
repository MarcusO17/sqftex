import type { Metadata } from "next";
import { Archivo, Work_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "700", "900"],
});
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "sqftex — Microwarehousing for Malaysia",
  description:
    "sqftex connects Space Owners with spare square footage to Space Seekers who need short- or mid-term storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${archivo.variable} ${workSans.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
