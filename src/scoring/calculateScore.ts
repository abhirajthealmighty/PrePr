export interface Violation {
  message: string;
  severity?: "low" | "medium" | "high";
}

export function calculateScore(
  violations: Violation[]
): number {

  let score = 100;

  for (const v of violations) {
    switch (v.severity) {
      case "high":
        score -= 20;
        break;
      case "medium":
        score -= 10;
        break;
      case "low":
      default:
        score -= 5;
    }
  }

  return Math.max(score, 0);
}