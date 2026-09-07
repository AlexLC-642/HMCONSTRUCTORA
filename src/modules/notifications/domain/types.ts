import type { Route } from "next";

export type SystemNotification = {
	id: string;
	title: string;
	detail: string;
	href: Route;
	unread: boolean;
	type: "alert" | "activity";
	module: string;
	actionLabel: string;
};
