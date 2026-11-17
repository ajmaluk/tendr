import { describe, it, expect } from 'vitest';
import { generatePRReportMarkdown } from '../src/pr/report';
import { PRAnalysisResult } from '../src/pr/analyze';

describe('PR Markdown Report Generator', () => {
  it('formats clean, comprehensive Markdown report', () => {
    const analysis: PRAnalysisResult = {
      totalFiles: 3,
      additions: 120,
      deletions: 15,
      totalChanges: 135,
      sizeLabel: 'size/M',
      areaGroups: [
        { area: 'src', filesCount: 2, additions: 100, deletions: 15 },
        { area: 'tests', filesCount: 1, additions: 20, deletions: 0 },
      ],
      hasTestChanges: true,
      needsTestsWarning: false,
      hasDocsChanges: false,
      needsDocsWarning: true,
      riskyFiles: ['src/auth/token.ts'],
      conventionalTitle: {
        isValid: true,
        type: 'feat',
        scope: 'auth',
        isBreaking: false,
        description: 'implement token rotation',
        raw: 'feat(auth): implement token rotation',
      },
      isConventionalTitleValid: true,
      hasLinkedIssue: true,
      linkedIssueWarning: false,
      areaLabels: ['area/src', 'area/tests'],
    };

    const markdown = generatePRReportMarkdown(analysis);

    expect(markdown).toContain('### 📊 Pull Request Analysis');
    expect(markdown).toContain('`size/M`');
    expect(markdown).toContain('`src/`');
    expect(markdown).toContain('`tests/`');
    expect(markdown).toContain('src/auth/token.ts');
    expect(markdown).toContain('Valid Conventional Commit (`feat(auth)`)');
    expect(markdown).toContain('Closing issue reference detected');
  });
});
