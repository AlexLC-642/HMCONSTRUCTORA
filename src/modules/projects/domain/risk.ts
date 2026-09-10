export type ProgressRiskLevel = "Riesgo" | "Atencion" | "En ritmo";

// Single source of truth for "is this project (or the portfolio) behind
// schedule, and how badly". Reused by the server-computed per-project risk
// badge (dashboard.ts) and by every dashboard chart that colors a progress
// gap, so the same project never reads as a different severity depending on
// which widget you're looking at.
export function classifyProgressGap(
	gap: number,
	overdueActivities = 0,
): ProgressRiskLevel {
	if (overdueActivities > 0 || gap <= -15) return "Riesgo";
	if (gap <= -5) return "Atencion";
	return "En ritmo";
}
