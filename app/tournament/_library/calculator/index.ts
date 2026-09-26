import { getMatchWeekNumber, getCurrentServerWeek } from "../utils";

export function getTournamentWeekNumber(dateString?: string): number {
  return dateString ? getMatchWeekNumber(dateString) : getCurrentServerWeek();
}

export * from "./standings";
export * from "./profile";
export * from "./prediction";
export * from "./playoff";
