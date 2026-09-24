// Kept out of FitText.tsx so that file exports only a component (fast refresh).

/** Approximate width of a string in `em` (digits and signs ≈ 0.6em, spaces ≈ 0.3em). */
export function estimateWidthEm(text: string): number {
  let em = 0;
  for (const ch of text) em += ch === " " || ch === "\u00A0" || ch === "\u202F" ? 0.3 : 0.62;
  return em;
}
