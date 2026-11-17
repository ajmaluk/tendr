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
export function parseSemver(versionStr: string): SemverVersion | null {
  const match = versionStr.trim().match(/^(v)?(\d+)\.(\d+)\.(\d+)/i);
  if (!match) return null;

  return {
    hasVPrefix: Boolean(match[1]),
    major: parseInt(match[2], 10),
    minor: parseInt(match[3], 10),
    patch: parseInt(match[4], 10),
  };
}

/**
 * Calculates the next version string based on current version and bump type.
 */
export function bumpVersion(
  currentVersionStr: string | null | undefined,
  bumpType: SemverBumpType,
): string {
  if (!currentVersionStr) {
    return 'v1.0.0';
  }

  const parsed = parseSemver(currentVersionStr);
  if (!parsed) {
    return 'v1.0.0';
  }

  const prefix = parsed.hasVPrefix ? 'v' : '';
  if (bumpType === 'major') {
    return `${prefix}${parsed.major + 1}.0.0`;
  }
  if (bumpType === 'minor') {
    return `${prefix}${parsed.major}.${parsed.minor + 1}.0`;
  }
  return `${prefix}${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

/**
 * Compares two semantic version strings.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 * Non-prereleases are prioritized over prereleases when versions are equal.
 */
export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA && !parsedB) return a.localeCompare(b);
  if (!parsedA) return -1;
  if (!parsedB) return 1;

  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor;
  if (parsedA.patch !== parsedB.patch) return parsedA.patch - parsedB.patch;

  const isPreA = /-[0-9A-Za-z.-]+$/.test(a);
  const isPreB = /-[0-9A-Za-z.-]+$/.test(b);
  if (isPreA && !isPreB) return -1;
  if (!isPreA && isPreB) return 1;

  return 0;
}

/**
 * Determines semver bump type based on PRs:
 * - Any breaking change -> major
 * - Any feat -> minor
 * - Otherwise -> patch
 */
export function determineBumpType(prs: Array<{ isBreaking: boolean; type: string | null }>): SemverBumpType {
  for (const pr of prs) {
    if (pr.isBreaking) {
      return 'major';
    }
  }

  for (const pr of prs) {
    if (pr.type === 'feat') {
      return 'minor';
    }
  }

  return 'patch';
}
