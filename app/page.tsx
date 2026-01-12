"use client";

import { useRouter } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";

export default function HomePage() {
  const router = useRouter();

  return (
    <LandingPage
      onGetStarted={() => router.push("/dashboard")}
    />
  );
}
