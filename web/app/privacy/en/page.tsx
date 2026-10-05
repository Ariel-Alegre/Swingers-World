import type { Metadata } from "next";
import { PrivacyPage } from "../PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Swingers World",
  description: "Learn how Swingers World handles account, profile, message, location, and subscription data.",
  alternates: { languages: { es: "/privacy", en: "/privacy/en" } },
};

export default function EnglishPrivacyPage() {
  return <PrivacyPage locale="en" />;
}
