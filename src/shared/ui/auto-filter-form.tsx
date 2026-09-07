"use client";

import type { ReactNode } from "react";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AutoFilterForm({
  action,
  children,
  className,
  delay = 250
}: {
  action: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  function apply(form: HTMLFormElement, immediate = false) {
    if (timerRef.current) clearTimeout(timerRef.current);

    const run = () => {
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(form).entries()) {
        const text = String(value).trim();
        if (text) params.set(key, text);
      }
      params.set("page", "1");

      const query = params.toString();
      const href = (query ? `${action}?${query}` : action) as Parameters<typeof router.replace>[0];
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    };

    if (immediate) run();
    else timerRef.current = setTimeout(run, delay);
  }

  return (
    <form
      action={action}
      className={className}
      onChange={(event) => {
        const target = event.target;
        const isTextInput = target instanceof HTMLInputElement && target.type === "text";
        apply(event.currentTarget, !isTextInput);
      }}
      onInput={(event) => apply(event.currentTarget)}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget, true);
      }}
    >
      {children}
    </form>
  );
}
