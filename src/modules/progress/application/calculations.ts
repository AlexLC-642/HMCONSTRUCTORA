import { Prisma } from "@prisma/client";
import type { DailyReportActivityInput } from "../domain/validation";

const HUNDRED = new Prisma.Decimal(100);

export function calculateDailyReportActivity(input: DailyReportActivityInput) {
  const contractedQuantity = new Prisma.Decimal(input.contractedQuantity);
  const previousQuantity = new Prisma.Decimal(input.previousQuantity);
  const todayQuantity = new Prisma.Decimal(input.todayQuantity);
  const previousProgress = new Prisma.Decimal(input.previousProgress);
  const accumulatedQuantity = previousQuantity.add(todayQuantity).toDecimalPlaces(2);
  if (contractedQuantity.gt(0) && previousQuantity.gte(contractedQuantity) && todayQuantity.gt(0)) {
    throw new Error(`La actividad ${input.activityCode} ya esta completada y no admite mas cantidad ordinaria.`);
  }
  const newProgress = contractedQuantity.gt(0)
    ? accumulatedQuantity.div(contractedQuantity).mul(HUNDRED).toDecimalPlaces(2)
    : previousProgress;

  if (newProgress.gt(HUNDRED)) {
    throw new Error(`La actividad ${input.activityCode} supera el 100% de avance.`);
  }

  if (newProgress.lt(previousProgress)) {
    throw new Error(`La actividad ${input.activityCode} no puede bajar el avance aprobado anterior.`);
  }

  return {
    contractedQuantity,
    previousQuantity,
    todayQuantity,
    accumulatedQuantity,
    previousProgress,
    newProgress
  };
}