import type { Metadata } from "next";
import VerificationGuard from "./components/VerificationGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniFetch | Campus package delivery",
  description: "Student-powered package delivery for your campus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <VerificationGuard>
          {children}
        </VerificationGuard>
      </body>
    </html>
  );
}