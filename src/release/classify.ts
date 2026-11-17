import { ReleaseConfig } from '../config/schema';
import { parseConventionalCommit } from './conventional';

export interface MergedPRInfo {
  number: number;
  title: string;
  body?: string;
  author: string;
  mergedAt: string;
  labels: string[];
}

export interface ClassifiedPR {
  pr: MergedPRInfo;
  category: string;
  isBreaking: boolean;
  conventionalType: string | null;
}

/**
 * Checks if a PR qualifies as a breaking change based on label, title, or body footer.
 */
export function isBreakingChange(pr: MergedPRInfo, parsedType: { isBreaking: boolean }): boolean {
  // 1. Label check
  const lowerLabels = pr.labels.map((l) => l.toLowerCase());
  if (lowerLabels.some((l) => l.includes('breaking'))) {
    return true;
  }

  // 2. Conventional commit exclamation check (e.g. feat!:)
  if (parsedType.isBreaking) {
    return true;
  }

  // 3. Footer check in body
  if (pr.body && /(?:BREAKING[- ]CHANGE|BREAKING:)/i.test(pr.body)) {
    return true;
  }

  return false;
}

/**
 * Classifies PRs into configured release categories:
 * Priority order:
 * 1. Category labels mapping
 * 2. Conventional Commit type mapping
 * 3. Fallback to "Other Changes"
 */
export function classifyPullRequests(
  prs: MergedPRInfo[],
  config: ReleaseConfig,
): { classified: ClassifiedPR[]; breakingCount: number } {
  const result: ClassifiedPR[] = [];
  let breakingCount = 0;

  for (const pr of prs) {
    const conventional = parseConventionalCommit(pr.title);
    const breaking = isBreakingChange(pr, conventional);
    if (breaking) {
      breakingCount++;
    }

    const prLabelsLower = pr.labels.map((l) => l.toLowerCase());
    let matchedCategory: string | null = null;

    // If it's a breaking change, check if there is a Breaking Changes category
    if (breaking) {
      const breakingCategory = config.categories.find(
        (c) =>
          c.title.toLowerCase().includes('breaking') ||
          (c.labels && c.labels.some((l) => l.toLowerCase().includes('breaking'))),
      );
      if (breakingCategory) {
        matchedCategory = breakingCategory.title;
      }
    }

    // 1. Match by label mapping
    if (!matchedCategory) {
      for (const category of config.categories) {
        if (category.labels && category.labels.length > 0) {
          const hasLabel = category.labels.some((catLabel) =>
            prLabelsLower.includes(catLabel.toLowerCase()),
          );
          if (hasLabel) {
            matchedCategory = category.title;
            break;
          }
        }
      }
    }

    // 2. Match by Conventional Commit type mapping
    if (!matchedCategory && conventional.isValid && conventional.type) {
      for (const category of config.categories) {
        if (category.types && category.types.length > 0) {
          const hasType = category.types.some(
            (t) => t.toLowerCase() === conventional.type?.toLowerCase(),
          );
          if (hasType) {
            matchedCategory = category.title;
            break;
          }
        }
      }
    }

    // 3. Fallback
    const finalCategory = matchedCategory || 'Other Changes';

    result.push({
      pr,
      category: finalCategory,
      isBreaking: breaking,
      conventionalType: conventional.type,
    });
  }

  return { classified: result, breakingCount };
}
