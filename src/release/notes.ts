import { ClassifiedPR } from './classify';
import { ReleaseConfig } from '../config/schema';
import { sanitizeUserText } from '../github/client';

export interface ReleaseNotesOptions {
  version: string;
  previousVersion?: string;
  classifiedPRs: ClassifiedPR[];
  config: ReleaseConfig;
  firstTimeContributors?: Array<{ author: string; prNumber: number }>;
}

/**
 * Strips commit type prefixes (e.g. "feat(auth): " -> "") if desired,
 * or keeps clean title and ensures markdown formatting is clean.
 */
function cleanPRTitle(title: string): string {
  // Replace unescaped pipes or backticks that could break formatting
  return title.replace(/\r?\n/g, ' ').trim();
}

/**
 * Generates release notes in Markdown grouped by category, with a New Contributors section.
 */
export function generateReleaseNotes(options: ReleaseNotesOptions): string {
  const { version, classifiedPRs, config, firstTimeContributors = [] } = options;
  const lines: string[] = [];

  lines.push(`## Release ${version}`);
  lines.push('');

  // Group PRs by category
  const categoryMap = new Map<string, ClassifiedPR[]>();
  for (const item of classifiedPRs) {
    const list = categoryMap.get(item.category) || [];
    list.push(item);
    categoryMap.set(item.category, list);
  }

  // Iterate in configured category order
  const renderedCategories = new Set<string>();

  for (const cat of config.categories) {
    const items = categoryMap.get(cat.title);
    if (items && items.length > 0) {
      lines.push(`### ${cat.title}`);
      lines.push('');
      for (const item of items) {
        const title = cleanPRTitle(item.pr.title);
        lines.push(`- ${title} (#${item.pr.number}) @${item.pr.author}`);
      }
      lines.push('');
      renderedCategories.add(cat.title);
    }
  }

  // Any remaining categories (e.g. "Other Changes")
  for (const [catTitle, items] of categoryMap.entries()) {
    if (!renderedCategories.has(catTitle) && items.length > 0) {
      lines.push(`### ${catTitle}`);
      lines.push('');
      for (const item of items) {
        const title = cleanPRTitle(item.pr.title);
        lines.push(`- ${title} (#${item.pr.number}) @${item.pr.author}`);
      }
      lines.push('');
    }
  }

  // New Contributors Section
  if (firstTimeContributors.length > 0) {
    lines.push('### New Contributors');
    lines.push('');
    for (const c of firstTimeContributors) {
      lines.push(
        `- @${sanitizeUserText(c.author)} made their first contribution in #${c.prNumber}! 🎉`,
      );
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
