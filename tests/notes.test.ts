import { describe, it, expect } from 'vitest';
import { generateReleaseNotes } from '../src/release/notes';
import { ReleaseConfig } from '../src/config/schema';
import { ClassifiedPR } from '../src/release/classify';

describe('Release Notes Generator', () => {
  const config: ReleaseConfig = {
    categories: [
      { title: 'Breaking Changes', labels: ['breaking'], types: [] },
      { title: 'Features', labels: ['enhancement'], types: ['feat'] },
      { title: 'Bug Fixes', labels: ['bug'], types: ['fix'] },
      { title: 'Maintenance', types: ['chore'] },
    ],
  };

  it('generates grouped markdown release notes with new contributors', () => {
    const classifiedPRs: ClassifiedPR[] = [
      {
        pr: {
          number: 101,
          title: 'feat: add metrics dashboard',
          author: 'alice',
          mergedAt: '2026-02-01',
          labels: ['enhancement'],
        },
        category: 'Features',
        isBreaking: false,
        conventionalType: 'feat',
      },
      {
        pr: {
          number: 102,
          title: 'fix: resolve race condition in cache',
          author: 'bob',
          mergedAt: '2026-02-02',
          labels: ['bug'],
        },
        category: 'Bug Fixes',
        isBreaking: false,
        conventionalType: 'fix',
      },
    ];

    const notes = generateReleaseNotes({
      version: 'v1.1.0',
      classifiedPRs,
      config,
      firstTimeContributors: [{ author: 'bob', prNumber: 102 }],
    });

    expect(notes).toContain('## Release v1.1.0');
    expect(notes).toContain('### Features');
    expect(notes).toContain('- feat: add metrics dashboard (#101) @alice');
    expect(notes).toContain('### Bug Fixes');
    expect(notes).toContain('- fix: resolve race condition in cache (#102) @bob');
    expect(notes).toContain('### New Contributors');
    expect(notes).toContain('first contribution in #102');
  });
});
