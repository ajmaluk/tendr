import { describe, it, expect } from 'vitest';
import { analyzePullRequest } from '../src/pr/analyze';
import { PullRequestsConfig } from '../src/config/schema';

describe('Pull Request Analysis Engine', () => {
  const config: PullRequestsConfig = {
    sizeThresholds: { xs: 10, s: 50, m: 250, l: 1000 },
    testGlobs: ['**/*.test.*', '**/*.spec.*', 'tests/**'],
    docsGlobs: ['README.md', 'docs/**', 'CHANGELOG.md'],
    riskyGlobs: ['**/auth/**', '**/migrations/**', '.github/workflows/**', 'package-lock.json'],
    requireConventionalTitle: true,
    requireLinkedIssue: true,
  };

  it('triggers test warning when source files change without test files', () => {
    const files = [
      {
        filename: 'src/auth/service.ts',
        status: 'modified',
        additions: 30,
        deletions: 5,
        changes: 35,
      },
    ];

    const result = analyzePullRequest({
      files,
      title: 'feat(auth): add auth service',
      body: 'fixes #10',
      config,
    });

    expect(result.needsTestsWarning).toBe(true);
    expect(result.hasTestChanges).toBe(false);
    expect(result.sizeLabel).toBe('size/S');
    expect(result.riskyFiles).toContain('src/auth/service.ts');
  });

  it('passes test and docs check when tests and docs are included', () => {
    const files = [
      {
        filename: 'src/main.ts',
        status: 'modified',
        additions: 20,
        deletions: 2,
        changes: 22,
      },
      {
        filename: 'tests/main.test.ts',
        status: 'modified',
        additions: 15,
        deletions: 0,
        changes: 15,
      },
      {
        filename: 'docs/readme.md',
        status: 'modified',
        additions: 5,
        deletions: 1,
        changes: 6,
      },
    ];

    const result = analyzePullRequest({
      files,
      title: 'feat: add main orchestrator',
      body: 'Resolves #22',
      config,
    });

    expect(result.needsTestsWarning).toBe(false);
    expect(result.hasTestChanges).toBe(true);
    expect(result.needsDocsWarning).toBe(false);
    expect(result.hasDocsChanges).toBe(true);
  });

  it('validates Conventional Commits PR titles', () => {
    const valid = analyzePullRequest({
      files: [],
      title: 'fix(parser): handle empty strings correctly',
      config,
    });
    expect(valid.isConventionalTitleValid).toBe(true);
    expect(valid.conventionalTitle.type).toBe('fix');
    expect(valid.conventionalTitle.scope).toBe('parser');

    const invalid = analyzePullRequest({
      files: [],
      title: 'Fixed bug in parser',
      config,
    });
    expect(invalid.isConventionalTitleValid).toBe(false);
  });

  it('detects linked issues in PR body', () => {
    const withIssue = analyzePullRequest({
      files: [],
      title: 'feat: nice feature',
      body: 'Closes #123 and implements design',
      config,
    });
    expect(withIssue.hasLinkedIssue).toBe(true);
    expect(withIssue.linkedIssueWarning).toBe(false);

    const withoutIssue = analyzePullRequest({
      files: [],
      title: 'feat: nice feature',
      body: 'Just some description without issue reference',
      config,
    });
    expect(withoutIssue.hasLinkedIssue).toBe(false);
    expect(withoutIssue.linkedIssueWarning).toBe(true);
  });

  it('groups files by area correctly', () => {
    const files = [
      { filename: 'src/a.ts', status: 'modified', additions: 10, deletions: 0, changes: 10 },
      { filename: 'src/b.ts', status: 'modified', additions: 5, deletions: 2, changes: 7 },
      { filename: 'docs/guide.md', status: 'modified', additions: 20, deletions: 0, changes: 20 },
      { filename: 'package.json', status: 'modified', additions: 2, deletions: 1, changes: 3 },
    ];

    const result = analyzePullRequest({
      files,
      title: 'chore: update deps',
      config,
    });

    expect(result.areaGroups.some((g) => g.area === 'src')).toBe(true);
    expect(result.areaGroups.some((g) => g.area === 'docs')).toBe(true);
    expect(result.areaGroups.some((g) => g.area === 'root')).toBe(true);
    expect(result.areaLabels).toContain('area/src');
    expect(result.areaLabels).toContain('area/docs');
  });
});
