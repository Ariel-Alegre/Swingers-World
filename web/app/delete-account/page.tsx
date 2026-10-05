import type { Metadata } from "next";
import { DeleteAccountPage } from "./DeleteAccountPage";

export const metadata: Metadata = {
  title: "Eliminar cuenta | Swingers World",
  description: "Cómo solicitar la eliminación de tu cuenta de Swingers World y sus datos asociados.",
  alternates: { languages: { es: "/delete-account", en: "/delete-account/en" } },
};

export default function SpanishDeleteAccountPage() {
  return <DeleteAccountPage locale="es" />;
}
