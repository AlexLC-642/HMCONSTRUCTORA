"use client";

import { motion } from "motion/react";

export type PortalTabKey = "summary" | "budget" | "schedule" | "progress" | "documents";

type PortalTab = {
  key: PortalTabKey;
  label: string;
  detail: string;
  href: string;
};

export function PortalTabs({ active, tabs }: { active: PortalTabKey; tabs: PortalTab[] }) {
  return (
    <nav className="portal-tabs" aria-label="Secciones del portal">
      {tabs.map((tab) => {
        const selected = tab.key === active;

        return (
          <a aria-current={selected ? "page" : undefined} className="portal-tab" data-active={selected} href={tab.href} key={tab.key}>
            {selected ? <motion.span className="portal-tab-active" layoutId="portal-tab-active" transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} /> : null}
            <span className="portal-tab-label">{tab.label}</span>
            <span className="portal-tab-detail">{tab.detail}</span>
          </a>
        );
      })}
    </nav>
  );
}
