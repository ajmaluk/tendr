import { LabelRule } from '../config/schema';
import { logger } from '../util/logger';

export interface IssueTextContent {
  title: string;
  body?: string;
  existingLabels?: string[];
}

/**
 * Escapes special regex characters in a plain string for safe literal matching.
 */
export function escapeRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evaluates whether a keyword or pattern matches inside the issue text.
 * Truncates input text to a safe length (50,000 chars) to prevent ReDoS / CPU starvation.
 */
export function matchesRule(rule: LabelRule, text: string): boolean {
  // Safety guard against massive payloads causing ReDoS
  const safeText = text.slice(0, 50000).toLowerCase();

  // 1. Keyword check (case-insensitive with word boundaries)
  for (const kw of rule.keywords) {
    if (!kw) continue;
    const cleanKw = kw.trim().toLowerCase();
    if (cleanKw.length === 0) continue;

    const escaped = escapeRegex(cleanKw);
    const kwRegex = new RegExp(`(^|\\W)${escaped}($|\\W)`, 'i');
    if (kwRegex.test(safeText)) {
      return true;
    }
  }

  // 2. Regex pattern check (if configured)
  if (rule.patterns && rule.patterns.length > 0) {
    for (const pattern of rule.patterns) {
      if (!pattern) continue;
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(safeText)) {
          return true;
        }
      } catch (err: unknown) {
        logger.warn(`Invalid regex pattern "${pattern}" in label rule for "${rule.label}": ${String(err)}`);
      }
    }
  }

  return false;
}

/**
 * Determines which labels should be added to an issue based on label rules.
 * Skips labels that are already present on the issue.
 */
export function determineLabelsToAdd(
  rules: LabelRule[],
  issue: IssueTextContent,
): string[] {
  const combinedText = `${issue.title}\n${issue.body || ''}`;
  const existingSet = new Set((issue.existingLabels || []).map((l) => l.toLowerCase()));
  const labelsToAdd: string[] = [];

  for (const rule of rules) {
    const targetLabelLower = rule.label.toLowerCase();
    if (existingSet.has(targetLabelLower)) {
      continue;
    }

    if (matchesRule(rule, combinedText)) {
      labelsToAdd.push(rule.label);
      existingSet.add(targetLabelLower);
    }
  }

  return labelsToAdd;
}
