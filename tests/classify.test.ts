import { describe, it, expect } from 'vitest';
import {
  classifyPullRequests,
  isBreakingChange,
  MergedPRInfo,
} from '../src/release/classify';
import { ReleaseConfig } from '../src/config/schema';

describe('PR Release Classification', () => {
  const config: ReleaseConfig = {
    categories: [
      { title: 'Breaking Changes', labels: ['breaking'], types: [] },
      { title: 'Features', labels: ['enhancement'], types: ['feat'] },
      { title: 'Bug Fixes', labels: ['bug'], types: ['fix'] },
      { title: 'Documentation', labels: ['documentation'], types: ['docs'] },
      {
        title: 'Maintenance',
        labels: [],
        types: ['chore', 'refactor', 'ci', 'build', 'test'],
      },
    ],
  };

  it('detects breaking changes via label, exclamation mark, and footer', () => {
    expect(
      isBreakingChange(
        {
          number: 1,
          title: 'change db schema',
          labels: ['breaking-change'],
          author: 'dev',
          mergedAt: '',
        },
        { isBreaking: false },
      ),
    ).toBe(true);

    expect(
      isBreakingChange(
        {
          number: 2,
          title: 'feat!: redesign api',
          labels: [],
          author: 'dev',
          mergedAt: '',
        },
        { isBreaking: true },
      ),
    ).toBe(true);

    expect(
      isBreakingChange(
        {
          number: 3,
          title: 'update config',
          body: 'BREAKING CHANGE: removed deprecated keys',
          labels: [],
          author: 'dev',
          mergedAt: '',
        },
        { isBreaking: false },
      ),
    ).toBe(true);
  });

  it('classifies PRs prioritizing labels over conventional commit types', () => {
    const prs: MergedPRInfo[] = [
      {
        number: 10,
        title: 'fix(core): patch vulnerability',
        labels: ['enhancement'], // label takes priority
        author: 'alice',
        mergedAt: '2026-01-01',
      },
      {
        number: 11,
        title: 'feat: add dark mode',
        labels: [],
        author: 'bob',
        mergedAt: '2026-01-02',
      },
      {
        number: 12,
        title: 'chore: bump dependencies',
        labels: [],
        author: 'charlie',
        mergedAt: '2026-01-03',
      },
      {
        number: 13,
        title: 'misc custom change',
        labels: [],
        author: 'dan',
        mergedAt: '2026-01-04',
      },
    ];

    const { classified, breakingCount } = classifyPullRequests(prs, config);

    expect(breakingCount).toBe(0);
    expect(classified[0].category).toBe('Features'); // Matched enhancement label
    expect(classified[1].category).toBe('Features'); // Matched feat type
    expect(classified[2].category).toBe('Maintenance'); // Matched chore type
    expect(classified[3].category).toBe('Other Changes'); // Fallback
  });
});
