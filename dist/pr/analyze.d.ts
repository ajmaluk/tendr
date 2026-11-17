import { PullRequestFileInfo } from '../github/client';
import { PullRequestsConfig } from '../config/schema';
import { SizeLabel } from './size';
import { ParsedConventionalCommit } from '../release/conventional';
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
/**
 * Analyzes changed files and PR metadata according to configured rules.
 */
export declare function analyzePullRequest(params: {
    files: PullRequestFileInfo[];
    title: string;
    body?: string;
    config: PullRequestsConfig;
}): PRAnalysisResult;
