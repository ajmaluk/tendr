export type SemverBumpType = 'major' | 'minor' | 'patch';
export interface SemverVersion {
    major: number;
    minor: number;
    patch: number;
    hasVPrefix: boolean;
}
/**
 * Parses a semantic version string (e.g. "v1.2.3" or "2.0.1").
 */
export declare function parseSemver(versionStr: string): SemverVersion | null;
/**
 * Calculates the next version string based on current version and bump type.
 */
export declare function bumpVersion(currentVersionStr: string | null | undefined, bumpType: SemverBumpType): string;
/**
 * Compares two semantic version strings.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 * Non-prereleases are prioritized over prereleases when versions are equal.
 */
export declare function compareSemver(a: string, b: string): number;
/**
 * Determines semver bump type based on PRs:
 * - Any breaking change -> major
 * - Any feat -> minor
 * - Otherwise -> patch
 */
export declare function determineBumpType(prs: Array<{
    isBreaking: boolean;
    type: string | null;
}>): SemverBumpType;
