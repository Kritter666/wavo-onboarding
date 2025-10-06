import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wavo Onboarding",
  description: "Backbone for your data graph, IP graph, assistants, and analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
