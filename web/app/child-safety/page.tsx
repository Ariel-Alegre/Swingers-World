import type { Metadata } from "next";
import { ChildSafetyPage } from "./ChildSafetyPage";

export const metadata: Metadata = {
  title: "Estándares de seguridad infantil | Swingers World",
  description: "Conocé los estándares de Swingers World contra el abuso y la explotación sexual infantil, y cómo denunciar una preocupación.",
  alternates: { languages: { es: "/child-safety", en: "/child-safety/en" } },
};

export default function SpanishChildSafetyPage() {
  return <ChildSafetyPage locale="es" />;
}
