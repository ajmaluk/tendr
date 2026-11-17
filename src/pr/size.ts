export interface SizeThresholds {
  xs: number;
  s: number;
  m: number;
  l: number;
}

export const DEFAULT_SIZE_THRESHOLDS: SizeThresholds = {
  xs: 10,
  s: 50,
  m: 250,
  l: 1000,
};

export const SIZE_LABELS = [
  'size/XS',
  'size/S',
  'size/M',
  'size/L',
  'size/XL',
] as const;

export type SizeLabel = (typeof SIZE_LABELS)[number];

/**
 * Calculates the size category based on the total number of lines changed (additions + deletions).
 */
export function calculateSizeLabel(
  totalChangedLines: number,
  thresholds: SizeThresholds = DEFAULT_SIZE_THRESHOLDS,
): SizeLabel {
  if (totalChangedLines <= thresholds.xs) {
    return 'size/XS';
  }
  if (totalChangedLines <= thresholds.s) {
    return 'size/S';
  }
  if (totalChangedLines <= thresholds.m) {
    return 'size/M';
  }
  if (totalChangedLines <= thresholds.l) {
    return 'size/L';
  }
  return 'size/XL';
}

/**
 * Determines which size labels need to be removed (if an existing size label is present but outdated).
 */
export function determineOutdatedSizeLabels(
  existingLabels: string[],
  currentSizeLabel: SizeLabel,
): string[] {
  const outdated: string[] = [];
  for (const label of existingLabels) {
    if (SIZE_LABELS.includes(label as SizeLabel) && label !== currentSizeLabel) {
      outdated.push(label);
    }
  }
  return outdated;
}
