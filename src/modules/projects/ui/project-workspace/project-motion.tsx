"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type WorkspaceRevealProps = {
  children: ReactNode;
  className?: string;
};

export function WorkspaceReveal({ children, className }: WorkspaceRevealProps) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0.94, y: 8, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  );
}
