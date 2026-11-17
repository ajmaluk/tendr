export interface SizeThresholds {
    xs: number;
    s: number;
    m: number;
    l: number;
}
export declare const DEFAULT_SIZE_THRESHOLDS: SizeThresholds;
export declare const SIZE_LABELS: readonly ["size/XS", "size/S", "size/M", "size/L", "size/XL"];
export type SizeLabel = (typeof SIZE_LABELS)[number];
/**
 * Calculates the size category based on the total number of lines changed (additions + deletions).
 */
export declare function calculateSizeLabel(totalChangedLines: number, thresholds?: SizeThresholds): SizeLabel;
/**
 * Determines which size labels need to be removed (if an existing size label is present but outdated).
 */
export declare function determineOutdatedSizeLabels(existingLabels: string[], currentSizeLabel: SizeLabel): string[];
