import { describe, it, expect } from 'vitest';
import { determineLabelsToAdd, escapeRegex } from '../src/triage/labeler';
import { LabelRule } from '../src/config/schema';

describe('Issue Labeler', () => {
  const rules: LabelRule[] = [
    {
      label: 'bug',
      keywords: ['crash', 'exception', 'traceback', "doesn't work", 'regression'],
      patterns: ['^panic:', 'segfault'],
    },
    {
      label: 'question',
      keywords: ['how do i', 'how to', 'is it possible'],
      patterns: [],
    },
    {
      label: 'enhancement',
      keywords: ['feature request', 'would be nice', 'please add'],
      patterns: [],
    },
  ];

  it('matches keywords case-insensitively', () => {
    expect(
      determineLabelsToAdd(rules, {
        title: 'Application CRASH on startup',
        body: 'Here is the log',
      }),
    ).toEqual(['bug']);

    expect(
      determineLabelsToAdd(rules, {
        title: 'How do I configure this action?',
        body: 'Is it possible to use node20?',
      }),
    ).toEqual(['question']);
  });

  it('matches regex patterns', () => {
    expect(
      determineLabelsToAdd(rules, {
        title: 'panic: runtime error dereference',
        body: 'got segfault',
      }),
    ).toEqual(['bug']);
  });

  it('does not re-add labels that already exist on the issue (idempotent)', () => {
    const labels = determineLabelsToAdd(rules, {
      title: 'Crash in authentication',
      body: 'Exception thrown',
      existingLabels: ['bug'],
    });

    expect(labels).toEqual([]);
  });

  it('safely handles massive 100k+ character payloads without ReDoS or hang', () => {
    const hugeBody = 'a'.repeat(100000) + ' traceback ' + 'b'.repeat(20000);
    const start = Date.now();
    const labels = determineLabelsToAdd(rules, {
      title: 'Big log',
      body: hugeBody,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500); // Must be very fast
    expect(Array.isArray(labels)).toBe(true);
  });

  it('escapes regex characters correctly', () => {
    expect(escapeRegex('foo[bar].*+?')).toBe('foo\\[bar\\]\\.\\*\\+\\?');
  });

  it('handles empty titles and bodies safely', () => {
    const labels = determineLabelsToAdd(rules, {
      title: '',
      body: undefined,
    });
    expect(labels).toEqual([]);
  });
});
