"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { WordsPullUpMultiStyle } from "./WordsPullUpMultiStyle";

export function Features() {
  const gridRef = useRef<HTMLDivElement>(null);
  const isGridInView = useInView(gridRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: {
      scale: 0.95,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as any,
      },
    },
  };

  const cardsData = [
    {
      id: "video-card",
      type: "video",
      videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4",
      label: "AI that knows real placements.",
    },
    {
      id: "storyboard-card",
      type: "feature",
      num: "01",
      title: "ATS Resume Analyzer.",
      icon: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85",
      items: [
        "Instant ATS compatibility score",
        "Keyword alignment checking",
        "Structure and formatting analysis",
        "STAR/XYZ action bullet feedback",
      ],
      href: "/dashboard/resume",
    },
    {
      id: "critiques-card",
      type: "feature",
      num: "02",
      title: "AI Mock Interviews.",
      icon: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85",
      items: [
        "Real company-specific questions",
        "Interactive interview simulator",
        "Communication skill evaluation",
        "Granular technical accuracy scoring",
      ],
      href: "/dashboard/interview",
    },
    {
      id: "immersion-card",
      type: "feature",
      num: "03",
      title: "Placement Roadmap.",
      icon: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85",
      items: [
        "Personalized week-by-week study plan",
        "Tailored for your target companies",
        "Hand-picked practice questions",
        "Skills gap tracking and insights",
      ],
      href: "/dashboard/roadmap",
    },
  ];

  return (
    <section id="features" className="relative min-h-screen bg-black py-24 px-4 sm:px-6 md:px-8 lg:px-16 overflow-hidden flex flex-col justify-center items-center">
      {/* Background Noise overlay */}
      <div className="bg-noise absolute inset-0 opacity-[0.15] pointer-events-none z-0" />

      {/* Header Container */}
      <div className="text-center mb-16 md:mb-24 z-10 w-full max-w-4xl">
        <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-normal font-normal flex flex-col gap-2">
          <div>
            <WordsPullUpMultiStyle
              segments={[{ text: "Everything you need to get placed.", className: "text-primary font-normal" }]}
            />
          </div>
          <div>
            <WordsPullUpMultiStyle
              segments={[{ text: "Empowered by advanced RAG data. Trusted by students.", className: "text-gray-500 font-normal" }]}
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <motion.div
        ref={gridRef}
        variants={containerVariants}
        initial="hidden"
        animate={isGridInView ? "visible" : "hidden"}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-2 md:gap-1.5 w-full max-w-7xl lg:h-[480px] z-10"
      >
        {cardsData.map((card) => {
          if (card.type === "video") {
            return (
              <motion.div
                key={card.id}
                variants={cardVariants}
                className="relative h-[350px] md:h-auto lg:h-full rounded-2xl overflow-hidden group flex flex-col justify-end p-6 border border-neutral-900 shadow-xl"
              >
                {/* Background Video */}
                <video
                  src={card.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />

                {/* Gradients and Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent z-10" />
                <div className="noise-overlay absolute inset-0 opacity-[0.5] mix-blend-overlay pointer-events-none z-10" />

                {/* Bottom Label */}
                <span
                  className="relative font-medium text-lg tracking-wide z-20"
                  style={{ color: "#E1E0CC" }}
                >
                  {card.label}
                </span>
              </motion.div>
            );
          }

          // Otherwise it's a standard feature card
          return (
            <motion.div
              key={card.id}
              variants={cardVariants}
              className="relative bg-[#212121] h-[380px] md:h-auto lg:h-full rounded-2xl p-6 flex flex-col justify-between border border-neutral-800 shadow-xl group hover:border-neutral-700 transition-all duration-300 overflow-hidden"
            >
              {/* Subtle top noise overlay inside card */}
              <div className="bg-noise absolute inset-0 opacity-[0.05] pointer-events-none z-0" />

              {/* Top Section */}
              <div className="flex flex-col gap-4 relative z-10">
                {/* Header Icon & Number */}
                <div className="flex justify-between items-start">
                  <img
                    src={card.icon}
                    alt={card.title}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover border border-neutral-700"
                  />
                  <span className="text-[10px] sm:text-xs font-bold tracking-wider text-gray-500">
                    {card.num}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg sm:text-xl font-medium text-primary">
                  {card.title}
                </h3>

                {/* Checklist */}
                <ul className="flex flex-col gap-2.5 mt-2">
                  {card.items?.map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-gray-400 text-xs sm:text-sm leading-snug">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom link */}
              <div className="relative z-10 mt-6 md:mt-0">
                <Link
                  href={card.href || "#"}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary/80 hover:text-primary transition-colors group/link"
                >
                  Start preparing
                  <ArrowRight className="w-4 h-4 transform rotate-[-45deg] transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
