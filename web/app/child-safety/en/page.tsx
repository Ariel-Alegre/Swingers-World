import type { Metadata } from "next";
import { ChildSafetyPage } from "../ChildSafetyPage";

export const metadata: Metadata = {
  title: "Child Safety Standards | Swingers World",
  description: "Read Swingers World's standards against child sexual abuse and exploitation and learn how to report a concern.",
  alternates: { languages: { es: "/child-safety", en: "/child-safety/en" } },
};

export default function EnglishChildSafetyPage() {
  return <ChildSafetyPage locale="en" />;
}
