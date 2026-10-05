import type { Metadata } from "next";
import { PrivacyPage } from "./PrivacyPage";

export const metadata: Metadata = {
  title: "Política de privacidad | Swingers World",
  description: "Conocé cómo Swingers World trata los datos de tu cuenta, perfil, mensajes, ubicación y suscripciones.",
  alternates: { languages: { es: "/privacy", en: "/privacy/en" } },
};

export default function SpanishPrivacyPage() {
  return <PrivacyPage locale="es" />;
}
