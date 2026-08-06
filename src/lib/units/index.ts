// Yono Workout — Unit Conversion
// All workout data is stored in kilograms internally.
// Display units (kg or lb) are a presentation-layer concern.

export type WeightUnit = "kg" | "lb";
export type DistanceUnit = "km" | "mi";

export const LB_PER_KG = 2.2046226218;
export const KG_PER_LB = 0.45359237;

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / LB_PER_KG : value;
}

/**
 * Round a display-unit weight to the nearest sensible plate increment.
 * kg → 1.25, lb → 1.25 (light) or 2.5 (standard). Uses 1.25 for both to
 * keep single-plate precision at light weights; 2.5 for lb at heavier.
 */
export function roundToPlate(display: number, unit: WeightUnit): number {
  const inc = unit === "lb" ? 2.5 : 1.25;
  return Math.round(display / inc) * inc;
}

export function formatWeight(
  kg: number | null | undefined,
  unit: WeightUnit
): string {
  if (kg == null || kg <= 0) return unit === "lb" ? "0 lb" : "0 kg";
  const display = kgToDisplay(kg, unit);
  return `${Math.round(display * 100) / 100} ${unit}`;
}

export function formatDistance(meters: number | null | undefined, unit: DistanceUnit): string {
  if (meters == null || meters <= 0) return "0 m";
  if (unit === "mi") {
    const miles = meters / 1609.344;
    return `${Math.round(miles * 100) / 100} mi`;
  }
  if (meters >= 1000) {
    return `${Math.round((meters / 1000) * 100) / 100} km`;
  }
  return `${Math.round(meters)} m`;
}
