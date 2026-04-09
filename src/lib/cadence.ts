import { Cadence } from "@prisma/client";
import { formatISO, startOfDay, subDays } from "date-fns";

const cadenceWindow: Record<Cadence, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

export function getDefaultDateRange(cadence: Cadence) {
  const end = startOfDay(new Date());
  const start = subDays(end, cadenceWindow[cadence]);

  return {
    start: formatISO(start, { representation: "date" }),
    end: formatISO(end, { representation: "date" }),
  };
}

export function getCadenceLabel(cadence: Cadence) {
  if (cadence === Cadence.WEEKLY) return "Weekly";
  if (cadence === Cadence.BIWEEKLY) return "Every 2 weeks";
  return "Monthly";
}
