export function formatPercent(probability: number, digits = 1): string {
  return `${(probability * 100).toFixed(digits)}%`;
}

export function formatThreshold(threshold: number): string {
  return `${Math.round(threshold * 100)}%`;
}

export function formatMetric(value: number): string {
  return value.toFixed(4);
}
