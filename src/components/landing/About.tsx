"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { WordsPullUpMultiStyle } from "./WordsPullUpMultiStyle";

interface AnimatedLetterProps {
  char: string;
  index: number;
  totalChars: number;
  progress: MotionValue<number>;
}

function AnimatedLetter({ char, index, totalChars, progress }: AnimatedLetterProps) {
  const charProgress = index / totalChars;
  const start = Math.max(0, charProgress - 0.1);
  const end = Math.min(1, charProgress + 0.05);

  const opacity = useTransform(progress, [start, end], [0.2, 1]);

  return (
    <motion.span style={{ opacity }} className="inline-block">
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
}

export function About() {
  const textRef = useRef<HTMLParagraphElement>(null);

  const headingSegments = [
    {
      text: "We are PlacementPlot, ",
      className: "font-normal text-primary",
    },
    {
      text: "an intelligent preparation engine. ",
      className: "italic font-serif text-primary",
    },
    {
      text: "We provide high-fidelity resume feedback, mock interviews, and personalized guidance.",
      className: "font-normal text-primary",
    },
  ];

  const bodyText =
    "By leveraging Retrieval Augmented Generation (RAG), our platform cross-references your application materials and mock interview transcripts against real-world placement records, company question banks, and industry-standard templates. We help you transition seamlessly from academic preparation to corporate placement.";

  const { scrollYProgress } = useScroll({
    target: textRef,
    offset: ["start 0.8", "end 0.2"],
  });

  const chars = bodyText.split("");

  return (
    <section id="about" className="bg-black py-20 px-4 md:px-8 lg:px-12 w-full flex justify-center items-center">
      {/* Inner Card */}
      <div className="bg-[#101010] rounded-[2rem] p-8 md:p-16 lg:p-24 w-full max-w-6xl flex flex-col items-center text-center border border-neutral-900 shadow-2xl">
        
        {/* Label */}
        <span className="text-primary text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-8 md:mb-12">
          Placement intelligence
        </span>

        {/* Main Heading */}
        <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-4xl mx-auto leading-[0.95] sm:leading-[0.9] font-medium tracking-tight mb-8 md:mb-12">
          <WordsPullUpMultiStyle segments={headingSegments} />
        </div>

        {/* Body Paragraph with scroll reveal */}
        <p
          ref={textRef}
          className="text-[#DEDBC8] text-xs sm:text-sm md:text-base max-w-3xl mx-auto leading-relaxed tracking-wide flex flex-wrap justify-center gap-y-0.5 select-none"
        >
          {chars.map((char, index) => (
            <AnimatedLetter
              key={index}
              char={char}
              index={index}
              totalChars={chars.length}
              progress={scrollYProgress}
            />
          ))}
        </p>

      </div>
    </section>
  );
}
