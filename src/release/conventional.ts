export interface ParsedConventionalCommit {
  isValid: boolean;
  type: string | null;
  scope: string | null;
  isBreaking: boolean;
  description: string | null;
  raw: string;
}

const CONVENTIONAL_REGEX =
  /^([a-zA-Z0-9_-]+)(?:\(([a-zA-Z0-9_\-./]+)\))?(!)?:\s+(.+)$/;

/**
 * Parses a commit or PR title against the Conventional Commits specification.
 */
export function parseConventionalCommit(title: string): ParsedConventionalCommit {
  const trimmed = title.trim();
  const match = trimmed.match(CONVENTIONAL_REGEX);

  if (!match) {
    return {
      isValid: false,
      type: null,
      scope: null,
      isBreaking: false,
      description: null,
      raw: trimmed,
    };
  }

  const [, type, scope, exclamation, description] = match;

  return {
    isValid: true,
    type: type.toLowerCase(),
    scope: scope || null,
    isBreaking: Boolean(exclamation),
    description: description.trim(),
    raw: trimmed,
  };
}
