"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

type DashboardRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function DashboardReveal({ children, className = "", delay = 0 }: DashboardRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay, duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
