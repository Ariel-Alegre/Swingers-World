import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swingers World | Conectá a tu manera",
  description: "Una comunidad para adultos donde podés descubrir perfiles, conversar y conocer personas a tu ritmo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
