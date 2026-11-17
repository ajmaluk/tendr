import { LabelRule } from '../config/schema';
export interface IssueTextContent {
    title: string;
    body?: string;
    existingLabels?: string[];
}
/**
 * Escapes special regex characters in a plain string for safe literal matching.
 */
export declare function escapeRegex(literal: string): string;
/**
 * Evaluates whether a keyword or pattern matches inside the issue text.
 * Truncates input text to a safe length (50,000 chars) to prevent ReDoS / CPU starvation.
 */
export declare function matchesRule(rule: LabelRule, text: string): boolean;
/**
 * Determines which labels should be added to an issue based on label rules.
 * Skips labels that are already present on the issue.
 */
export declare function determineLabelsToAdd(rules: LabelRule[], issue: IssueTextContent): string[];
