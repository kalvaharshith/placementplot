"use client";

import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Features } from "@/components/landing/Features";

export default function Home() {
  return (
    <main className="landing-root w-full min-h-screen bg-black text-[#E1E0CC] overflow-x-hidden">
      <Hero />
      <About />
      <Features />
    </main>
  );
}
