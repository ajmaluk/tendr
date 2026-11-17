import { COMMENT_MARKERS, findCommentByMarker, postOrUpdateStickyComment } from '../github/comments';
import { GitHubClient } from '../github/client';
import { logger } from '../util/logger';

export interface SectionExtractionResult {
  found: boolean;
  content: string;
  isPlaceholder: boolean;
}

const PLACEHOLDER_PATTERNS = [
  /^[_*]*no response[_*]*$/i,
  /^n\/?a$/i,
  /^none$/i,
  /^nil$/i,
  /^null$/i,
  /^tbd$/i,
  /^todo$/i,
  /^-$|^--$|^\?$/,
  /^please fill (this )?in$/i,
  /^describe (here|your bug|the steps)$/i,
];

/**
 * Strips HTML comments from text.
 */
export function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

/**
 * Checks whether content is deemed empty or placeholder.
 */
export function isContentEmptyOrPlaceholder(content: string): boolean {
  const cleaned = stripHtmlComments(content)
    .replace(/\r\n/g, '\n')
    .replace(/^>\s*/gm, '') // strip blockquotes
    .trim();

  if (cleaned.length === 0) {
    return true;
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(cleaned)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes section titles for comparison (e.g. "Steps to reproduce" -> "steps to reproduce")
 */
function normalizeTitle(title: string): string {
  const norm = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Ensure it contains letters or numbers
  if (!/[a-z0-9]/.test(norm)) {
    return '';
  }
  return norm;
}

/**
 * Extracts sections from markdown body formatted with headings (### Header)
 * or label lines (Header: value).
 */
export function extractSections(
  markdown: string,
  validSectionNames?: string[],
): Map<string, string> {
  const sections = new Map<string, string>();
  if (!markdown) return sections;

  const validNormNames = validSectionNames
    ? new Set(validSectionNames.map((n) => normalizeTitle(n)).filter(Boolean))
    : null;

  const lines = markdown.split(/\r?\n/);
  let currentHeader: string | null = null;
  let currentLines: string[] = [];
  let inCodeFence = false;

  const flush = () => {
    if (currentHeader !== null) {
      const existing = sections.get(currentHeader) || '';
      const addition = currentLines.join('\n').trim();
      sections.set(currentHeader, existing ? `${existing}\n${addition}` : addition);
    }
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 0. Track code fences (``` or ~~~)
    if (/^(```|~~~)/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      if (currentHeader !== null) {
        currentLines.push(line);
      }
      continue;
    }

    if (inCodeFence) {
      if (currentHeader !== null) {
        currentLines.push(line);
      }
      continue;
    }

    // 1. Heading check: e.g. # Title, ## Title, ### Title
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      const norm = normalizeTitle(headingMatch[1]);
      if (norm.length > 0) {
        flush();
        currentHeader = norm;
        continue;
      }
    }

    // 2. Bold header or form label check: e.g. **Steps to reproduce:** or Steps to reproduce:
    // Disallow URL schemes (e.g. https://)
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
      const labelMatch = line.match(/^[*_]{0,2}([\w\s/-]{3,50})[*_]{0,2}:\s*(.*)$/);
      if (labelMatch) {
        const candidateNorm = normalizeTitle(labelMatch[1]);
        // Only treat as section header if it matches configured section names
        const isValid =
          validNormNames === null ||
          validNormNames.has(candidateNorm) ||
          Array.from(validNormNames).some(
            (v) =>
              v === candidateNorm ||
              (v.length >= 4 &&
                candidateNorm.length >= 4 &&
                (v.includes(candidateNorm) || candidateNorm.includes(v))),
          );

        if (isValid && candidateNorm.length > 0) {
          flush();
          currentHeader = candidateNorm;
          if (labelMatch[2].trim()) {
            currentLines.push(labelMatch[2].trim());
          }
          continue;
        }
      }
    }

    if (currentHeader !== null) {
      currentLines.push(line);
    }
  }

  flush();
  return sections;
}

/**
 * Determines which required sections are missing or contain only placeholders.
 */
export function checkMissingRequiredSections(
  body: string | undefined,
  requiredSections: string[],
): string[] {
  if (!requiredSections || requiredSections.length === 0) {
    return [];
  }

  const text = body || '';
  const sections = extractSections(text, requiredSections);
  const missing: string[] = [];

  for (const required of requiredSections) {
    const normRequired = normalizeTitle(required);
    if (!normRequired) continue;

    let matchedContent: string | null = null;

    // 1. Exact match on header title
    for (const [header, content] of sections.entries()) {
      if (header === normRequired) {
        matchedContent = content;
        break;
      }
    }

    // 2. Fallback partial match only when both strings have length >= 4
    if (matchedContent === null && normRequired.length >= 4) {
      for (const [header, content] of sections.entries()) {
        if (
          header.length >= 4 &&
          (header.includes(normRequired) || normRequired.includes(header))
        ) {
          matchedContent = content;
          break;
        }
      }
    }

    if (matchedContent === null) {
      missing.push(required);
    } else if (isContentEmptyOrPlaceholder(matchedContent)) {
      missing.push(required);
    }
  }

  return missing;
}

/**
 * Handles the required-information lifecycle for an issue:
 * - Checks required sections for all matching issue types / labels
 * - Posts or updates sticky warning comment and attaches needs-info label if missing
 * - Removes needs-info label and updates comment if information is now complete
 */
export async function processRequiredInfo(params: {
  client: GitHubClient;
  issueNumber: number;
  body?: string;
  labels: string[];
  requiredInfoConfig: Record<string, string[]>;
  needsInfoLabel: string;
}): Promise<{ missingSections: string[]; passed: boolean }> {
  const { client, issueNumber, body, labels, requiredInfoConfig, needsInfoLabel } = params;

  // Gather required sections based on labels present on the issue
  const activeRequiredSections = new Set<string>();
  const lowerLabels = labels.map((l) => l.toLowerCase());

  for (const [key, requiredList] of Object.entries(requiredInfoConfig)) {
    const normKey = key.toLowerCase();
    // If the issue has this label or the key is 'default' or '*'
    if (normKey === 'default' || normKey === '*' || lowerLabels.includes(normKey)) {
      for (const section of requiredList) {
        activeRequiredSections.add(section);
      }
    }
  }

  if (activeRequiredSections.size === 0) {
    const existingComment = await findCommentByMarker(
      client,
      issueNumber,
      COMMENT_MARKERS.TRIAGE_INFO,
    );
    if (existingComment || lowerLabels.includes(needsInfoLabel.toLowerCase())) {
      logger.info(
        `Issue #${issueNumber} no longer requires required-info. Cleaning up ${needsInfoLabel} and updating status comment.`,
      );
      await client.removeLabel(issueNumber, needsInfoLabel);
      if (existingComment) {
        const resolvedBody = [
          '### ✅ Information Complete',
          '',
          'All required information provided or no longer required. Thank you!',
        ].join('\n');
        await postOrUpdateStickyComment(
          client,
          issueNumber,
          COMMENT_MARKERS.TRIAGE_INFO,
          resolvedBody,
        );
      }
    }
    return { missingSections: [], passed: true };
  }

  const missing = checkMissingRequiredSections(body, Array.from(activeRequiredSections));

  if (missing.length > 0) {
    logger.info(
      `Issue #${issueNumber} is missing required sections: ${missing.join(', ')}. Applying ${needsInfoLabel}.`,
    );

    const commentBody = [
      '### ⚠️ Missing Required Information',
      '',
      'Thank you for submitting this issue! To help the maintainers investigate and resolve it effectively, please edit your description to include the following missing information:',
      '',
      ...missing.map((section) => `- **${section}**`),
      '',
      `Once you update the issue description with the required details, the \`${needsInfoLabel}\` label will be automatically removed.`,
    ].join('\n');

    await postOrUpdateStickyComment(
      client,
      issueNumber,
      COMMENT_MARKERS.TRIAGE_INFO,
      commentBody,
    );

    await client.addLabels(issueNumber, [needsInfoLabel]);
    return { missingSections: missing, passed: false };
  }

  // All required info is present!
  // If the issue previously had the needs-info label, remove it and update comment
  const existingComment = await findCommentByMarker(
    client,
    issueNumber,
    COMMENT_MARKERS.TRIAGE_INFO,
  );

  if (existingComment || lowerLabels.includes(needsInfoLabel.toLowerCase())) {
    logger.info(
      `Issue #${issueNumber} now has all required information. Removing ${needsInfoLabel} and updating status comment.`,
    );

    await client.removeLabel(issueNumber, needsInfoLabel);

    if (existingComment) {
      const resolvedBody = [
        '### ✅ Information Complete',
        '',
        'Thank you for updating the issue with all required details! Our maintainers will review it shortly.',
      ].join('\n');

      await postOrUpdateStickyComment(
        client,
        issueNumber,
        COMMENT_MARKERS.TRIAGE_INFO,
        resolvedBody,
      );
    }
  }

  return { missingSections: [], passed: true };
}
