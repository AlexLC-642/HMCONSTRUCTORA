import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/application/current-user";
import { isSuperAdministrator } from "@/modules/auth/application/authorization";
import { prisma } from "@/shared/lib/prisma";

/**
 * POST /api/dev/reset-database
 *
 * DEVELOPMENT ONLY - Removes all project data for testing
 * Keeps: Users, Roles, Permissions
 * Deletes: Projects, Budgets, Schedules, Reports, Documents, Inventory
 *
 * Triple-gated on purpose: NODE_ENV alone is not a reliable production
 * guard (a misconfigured deployment can leave it as "development"), so an
 * unauthenticated caller must not be able to wipe all operational data just
 * because that one variable was set wrong. Every condition below must hold.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  if (process.env.ALLOW_DEV_DB_RESET !== "true") {
    return NextResponse.json(
      { error: "Set ALLOW_DEV_DB_RESET=true locally to enable this endpoint." },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();
  if (!user || !isSuperAdministrator(user.roles)) {
    return NextResponse.json(
      { error: "Requires an authenticated superadministrator session." },
      { status: 403 }
    );
  }

  try {
    // Delete in dependency order (child → parent)
    await prisma.dailyReportActivity.deleteMany({});
    await prisma.dailyReportLabor.deleteMany({});
    await prisma.dailyReportMaterial.deleteMany({});
    await prisma.dailyReportMedia.deleteMany({});
    await prisma.dailyReport.deleteMany({});
    
    await prisma.scheduleActivityDependency.deleteMany({});
    await prisma.scheduleAssignment.deleteMany({});
    await prisma.scheduleActivity.deleteMany({});
    await prisma.schedule.deleteMany({});
    
    await prisma.budgetLineItem.deleteMany({});
    await prisma.budgetSection.deleteMany({});
    await prisma.budgetVersion.deleteMany({});
    await prisma.budget.deleteMany({});
    
    await prisma.requisitionItem.deleteMany({});
    await prisma.requisition.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.stock.deleteMany({});
    await prisma.inventoryMaterial.deleteMany({});
    await prisma.warehouse.deleteMany({});
    
    await prisma.documentVersion.deleteMany({});
    await prisma.projectDocument.deleteMany({});
    
    await prisma.projectMember.deleteMany({});
    await prisma.portalShare.deleteMany({});
    await prisma.project.deleteMany({});
    
    await prisma.financialExpense.deleteMany({});
    await prisma.clientPayment.deleteMany({});
    await prisma.client.deleteMany({});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

