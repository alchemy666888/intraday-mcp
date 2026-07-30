export const SCHEMA_VERSION = "1.0.0";
export const CALCULATION_VERSION = "bats-1.0.0";

export type BatsQuality = {
  executionCriticalComplete: boolean;
  regimeCriticalComplete: boolean;
  strategySpecificComplete: { C1LiquidationReversal: boolean };
  optionalContextComplete: boolean;
  completeness: "complete" | "core_complete" | "partial" | "insufficient";
  missingFields: string[];
  staleFields: string[];
  unavailableFields: string[];
  warnings: string[];
};
