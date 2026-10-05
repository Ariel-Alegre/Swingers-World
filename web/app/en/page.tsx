import type { Metadata } from "next";
import { LandingPage } from "../LandingPage";

export const metadata: Metadata = {
  title: "Swingers World | Connect your way",
  description: "An adults-only space to discover profiles, connect, and chat at your own pace.",
};

export default function EnglishHome() {
  return <LandingPage locale="en" />;
}
