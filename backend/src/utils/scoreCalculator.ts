/**
 * Pet score calculation based on breed base score, weight deviation, and age.
 * Score range: 1.0 – 5.0 (one decimal place)
 *
 * - Breed base_score is the primary factor.
 * - If the breed has an avg_weight_kg, the actual weight deviation adjusts
 *   the score by up to ±0.5.
 * - Senior pets (7+ years) get a small bump (+0.2).
 */
export function calculatePetScore(
  breedBaseScore: number,
  avgWeightKg: number | null,
  actualWeightKg: number,
  ageYears: number,
): number {
  let score = breedBaseScore;

  if (avgWeightKg && avgWeightKg > 0) {
    const ratio = actualWeightKg / avgWeightKg;
    const weightAdjust = (ratio - 1) * 0.5;
    score += Math.max(-0.5, Math.min(0.5, weightAdjust));
  }

  if (ageYears >= 7) {
    score += 0.2;
  }

  score = Math.max(1, Math.min(5, score));
  return Math.round(score * 10) / 10;
}
