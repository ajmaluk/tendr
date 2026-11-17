export interface ParsedConventionalCommit {
    isValid: boolean;
    type: string | null;
    scope: string | null;
    isBreaking: boolean;
    description: string | null;
    raw: string;
}
/**
 * Parses a commit or PR title against the Conventional Commits specification.
 */
export declare function parseConventionalCommit(title: string): ParsedConventionalCommit;
