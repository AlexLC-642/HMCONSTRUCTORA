"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PremiumCountUpProps = {
  value: number;
  format?: "integer" | "money" | "money-short" | "percent";
};

const currencyFormatter = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" });

function formatCountValue(value: number, format: PremiumCountUpProps["format"]) {
  if (format === "money-short") {
    if (Math.abs(value) >= 1_000_000) return `Q ${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `Q ${(value / 1_000).toFixed(0)}K`;
    return currencyFormatter.format(value);
  }

  if (format === "money") return currencyFormatter.format(value);
  if (format === "percent") return `${value.toFixed(1)}%`;
  return value.toFixed(0);
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PremiumCountUp({ value, format = "integer" }: PremiumCountUpProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const formattedValue = useMemo(() => formatCountValue(displayValue, format), [displayValue, format]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      previousValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const start = performance.now();
    const initialValue = previousValueRef.current;
    const distance = value - initialValue;
    const duration = 760;
    let frame = 0;

    function animate(time: number) {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(initialValue + distance * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = value;
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{formattedValue}</>;
}
