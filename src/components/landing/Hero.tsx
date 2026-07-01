"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { WordsPullUp } from "./WordsPullUp";
import { supabase } from "@/lib/supabase";

export function Hero() {
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const navItems = [
    { label: "Features", href: "#features", isHash: true },
    { label: "About", href: "#about", isHash: true },
    ...(user
      ? [{ label: "Dashboard", href: "/dashboard", isHash: false }]
      : [
          { label: "Log In", href: "/login", isHash: false },
          { label: "Sign Up", href: "/signup", isHash: false },
        ]),
  ];

  const fadeUpVariants = {
    hidden: {
      y: 20,
      opacity: 0,
    },
    visible: (delay: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1] as any,
      },
    }),
  };

  return (
    <section className="relative w-full h-screen p-4 md:p-6 bg-black overflow-hidden flex flex-col justify-between">
      {/* Inner Container */}
      <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden flex flex-col justify-between">
        
        {/* Background Video */}
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Noise Overlay */}
        <div className="noise-overlay absolute inset-0 opacity-[0.7] mix-blend-overlay pointer-events-none z-10" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-10" />

        {/* Navbar */}
        <header className="absolute top-0 left-0 right-0 flex justify-center z-20">
          <nav className="bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-3 md:px-8 flex items-center gap-4 sm:gap-6 md:gap-12 lg:gap-14 border-t-0 border-x border-b border-neutral-900/50">
            {navItems.map((item, index) => {
              if (item.isHash) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-[10px] sm:text-xs md:text-sm font-medium tracking-wide uppercase transition-colors"
                    style={{
                      color: hoveredNav === index ? "#E1E0CC" : "rgba(225, 224, 204, 0.8)",
                    }}
                    onMouseEnter={() => setHoveredNav(index)}
                    onMouseLeave={() => setHoveredNav(null)}
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[10px] sm:text-xs md:text-sm font-medium tracking-wide uppercase transition-colors"
                  style={{
                    color: hoveredNav === index ? "#E1E0CC" : "rgba(225, 224, 204, 0.8)",
                  }}
                  onMouseEnter={() => setHoveredNav(index)}
                  onMouseLeave={() => setHoveredNav(null)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Bottom-aligned Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-20 flex flex-col justify-end w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end w-full max-w-8xl mx-auto">
            
            {/* Giant Title Column */}
            <div className="col-span-1 lg:col-span-8 flex justify-start">
              <h1 
                className="font-medium leading-[0.85] tracking-[-0.07em] select-none text-[13vw] sm:text-[12vw] md:text-[11vw] lg:text-[10vw] xl:text-[9.5vw] 2xl:text-[10vw]"
                style={{ color: "#E1E0CC" }}
              >
                <WordsPullUp text="PlacementPlot" showAsterisk={true} />
              </h1>
            </div>

            {/* Description & Button Column */}
            <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 lg:pb-6 items-start lg:items-end lg:text-right">
              
              {/* Description Paragraph */}
              <motion.p
                variants={fadeUpVariants}
                custom={0.5}
                initial="hidden"
                animate="visible"
                className="text-primary/70 text-xs sm:text-sm md:text-base max-w-md lg:text-right"
                style={{ lineHeight: "1.2" }}
              >
                PlacementPlot is an AI-powered preparation ecosystem grounded in real hiring data. Elevate your ATS resume score, practice with interactive mock interviews, and master company-specific patterns.
              </motion.p>

              {/* CTA Button */}
              <Link href={user ? "/dashboard" : "/signup"} className="block">
                <motion.div
                  variants={fadeUpVariants}
                  custom={0.7}
                  initial="hidden"
                  animate="visible"
                  className="group flex items-center gap-2 bg-primary text-black font-medium rounded-full py-1.5 pl-6 pr-1.5 text-sm sm:text-base hover:gap-3 transition-all duration-300 shadow-lg shadow-black/20 cursor-pointer"
                >
                  {user ? "Go to dashboard" : "Get started free"}
                  <div className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </motion.div>
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
