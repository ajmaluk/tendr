import picomatch from 'picomatch';
import { PullRequestFileInfo } from '../github/client';
import { PullRequestsConfig } from '../config/schema';
import { calculateSizeLabel, SizeLabel } from './size';
import { parseConventionalCommit, ParsedConventionalCommit } from '../release/conventional';

export interface AreaGroup {
  area: string;
  filesCount: number;
  additions: number;
  deletions: number;
}

export interface PRAnalysisResult {
  totalFiles: number;
  additions: number;
  deletions: number;
  totalChanges: number;
  sizeLabel: SizeLabel;
  areaGroups: AreaGroup[];
  hasTestChanges: boolean;
  needsTestsWarning: boolean;
  hasDocsChanges: boolean;
  needsDocsWarning: boolean;
  riskyFiles: string[];
  conventionalTitle: ParsedConventionalCommit;
  isConventionalTitleValid: boolean;
  hasLinkedIssue: boolean;
  linkedIssueWarning: boolean;
  areaLabels: string[];
}

const LINKED_ISSUE_REGEX =
  /\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved):?\s+(?:(?:[a-z0-9_.-]+\/[a-z0-9_.-]+)?#\d+|https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:issues|pull)\/\d+)/i;

/**
 * Checks if a filename represents a source code file.
 */
function isSourceFile(filename: string): boolean {
  return (
    /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb|php|c|cpp|h|hpp|cs|swift|scala)$/i.test(
      filename,
    ) ||
    filename.startsWith('src/') ||
    filename.startsWith('lib/')
  );
}

/**
 * Extracts the top-level directory or 'root' for file grouping.
 */
function getTopLevelArea(filename: string): string {
  const parts = filename.split('/');
  if (parts.length <= 1) {
    return 'root';
  }
  return parts[0];
}

/**
 * Analyzes changed files and PR metadata according to configured rules.
 */
export function analyzePullRequest(params: {
  files: PullRequestFileInfo[];
  title: string;
  body?: string;
  config: PullRequestsConfig;
}): PRAnalysisResult {
  const { files, title, body = '', config } = params;

  let additions = 0;
  let deletions = 0;

  const areaMap = new Map<string, { filesCount: number; additions: number; deletions: number }>();
  const riskyFiles: string[] = [];

  const isTestFile = picomatch(config.testGlobs);
  const isDocFile = picomatch(config.docsGlobs);
  const isRiskyFile = picomatch(config.riskyGlobs);

  let hasTestChanges = false;
  let hasSourceChanges = false;
  let hasDocsChanges = false;

  for (const file of files) {
    additions += file.additions;
    deletions += file.deletions;

    const area = getTopLevelArea(file.filename);
    const existing = areaMap.get(area) || { filesCount: 0, additions: 0, deletions: 0 };
    existing.filesCount += 1;
    existing.additions += file.additions;
    existing.deletions += file.deletions;
    areaMap.set(area, existing);

    // Check test changes
    if (isTestFile(file.filename)) {
      hasTestChanges = true;
    } else if (isSourceFile(file.filename)) {
      hasSourceChanges = true;
    }

    // Check docs changes
    if (isDocFile(file.filename)) {
      hasDocsChanges = true;
    }

    // Check risky paths
    if (isRiskyFile(file.filename)) {
      riskyFiles.push(file.filename);
    }
  }

  const totalChanges = additions + deletions;
  const sizeLabel = calculateSizeLabel(totalChanges, config.sizeThresholds);

  // Group by area
  const areaGroups: AreaGroup[] = Array.from(areaMap.entries()).map(([area, data]) => ({
    area,
    filesCount: data.filesCount,
    additions: data.additions,
    deletions: data.deletions,
  }));
  areaGroups.sort((a, b) => b.filesCount - a.filesCount);

  // Tests warning: source files modified but no tests touched
  const needsTestsWarning = hasSourceChanges && !hasTestChanges;

  // Docs warning: source files modified but no docs touched (only if docsGlobs configured)
  const needsDocsWarning = hasSourceChanges && !hasDocsChanges && config.docsGlobs.length > 0;

  // Conventional Commits check
  const conventionalTitle = parseConventionalCommit(title);
  const isConventionalTitleValid = config.requireConventionalTitle
    ? conventionalTitle.isValid
    : true;

  // Linked issue check
  const hasLinkedIssue = LINKED_ISSUE_REGEX.test(body);
  const linkedIssueWarning = config.requireLinkedIssue && !hasLinkedIssue;

  // Area labels: label top-level non-root areas
  const areaLabels = areaGroups
    .filter((g) => g.area !== 'root')
    .map((g) => `area/${g.area}`);

  return {
    totalFiles: files.length,
    additions,
    deletions,
    totalChanges,
    sizeLabel,
    areaGroups,
    hasTestChanges,
    needsTestsWarning,
    hasDocsChanges,
    needsDocsWarning,
    riskyFiles,
    conventionalTitle,
    isConventionalTitleValid,
    hasLinkedIssue,
    linkedIssueWarning,
    areaLabels,
  };
}
