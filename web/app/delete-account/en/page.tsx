import type { Metadata } from "next";
import { DeleteAccountPage } from "../DeleteAccountPage";

export const metadata: Metadata = {
  title: "Delete account | Swingers World",
  description: "How to request deletion of your Swingers World account and associated data.",
  alternates: { languages: { es: "/delete-account", en: "/delete-account/en" } },
};

export default function EnglishDeleteAccountPage() {
  return <DeleteAccountPage locale="en" />;
}
