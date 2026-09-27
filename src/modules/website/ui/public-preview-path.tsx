"use client";
import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";
export const PublicPreviewPath = createContext<string | null>(null);
export function usePublicPathname() {
	const pathname = usePathname();
	return useContext(PublicPreviewPath) ?? pathname;
}
