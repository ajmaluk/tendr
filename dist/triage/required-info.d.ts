import { GitHubClient } from '../github/client';
export interface SectionExtractionResult {
    found: boolean;
    content: string;
    isPlaceholder: boolean;
}
/**
 * Strips HTML comments from text.
 */
export declare function stripHtmlComments(text: string): string;
/**
 * Checks whether content is deemed empty or placeholder.
 */
export declare function isContentEmptyOrPlaceholder(content: string): boolean;
/**
 * Extracts sections from markdown body formatted with headings (### Header)
 * or label lines (Header: value).
 */
export declare function extractSections(markdown: string, validSectionNames?: string[]): Map<string, string>;
/**
 * Determines which required sections are missing or contain only placeholders.
 */
export declare function checkMissingRequiredSections(body: string | undefined, requiredSections: string[]): string[];
/**
 * Handles the required-information lifecycle for an issue:
 * - Checks required sections for all matching issue types / labels
 * - Posts or updates sticky warning comment and attaches needs-info label if missing
 * - Removes needs-info label and updates comment if information is now complete
 */
export declare function processRequiredInfo(params: {
    client: GitHubClient;
    issueNumber: number;
    body?: string;
    labels: string[];
    requiredInfoConfig: Record<string, string[]>;
    needsInfoLabel: string;
}): Promise<{
    missingSections: string[];
    passed: boolean;
}>;
