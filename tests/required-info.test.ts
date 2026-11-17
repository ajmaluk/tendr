import { describe, it, expect } from 'vitest';
import {
  extractSections,
  isContentEmptyOrPlaceholder,
  checkMissingRequiredSections,
  stripHtmlComments,
} from '../src/triage/required-info';

describe('Required Information Detection', () => {
  it('strips HTML comments correctly', () => {
    const raw = '<!-- template note -->\nActual content here<!-- inline comment -->';
    expect(stripHtmlComments(raw)).toBe('Actual content here');
  });

  it('detects empty and placeholder values accurately', () => {
    expect(isContentEmptyOrPlaceholder('')).toBe(true);
    expect(isContentEmptyOrPlaceholder('   ')).toBe(true);
    expect(isContentEmptyOrPlaceholder('_No response_')).toBe(true);
    expect(isContentEmptyOrPlaceholder('*no response*')).toBe(true);
    expect(isContentEmptyOrPlaceholder('N/A')).toBe(true);
    expect(isContentEmptyOrPlaceholder('none')).toBe(true);
    expect(isContentEmptyOrPlaceholder('todo')).toBe(true);
    expect(isContentEmptyOrPlaceholder('<!-- describe -->')).toBe(true);

    expect(isContentEmptyOrPlaceholder('Node v20.10.0 on macOS 14')).toBe(false);
    expect(isContentEmptyOrPlaceholder('1. Open settings\n2. Click save')).toBe(false);
  });

  it('extracts markdown headings and issue form outputs', () => {
    const body = `
### Version
2.1.0

### Steps to reproduce
1. Run npm start
2. Open localhost:3000

### Expected behavior
Page loads cleanly

### Actual behavior
_No response_
`;

    const sections = extractSections(body);
    expect(sections.get('version')).toBe('2.1.0');
    expect(sections.get('steps to reproduce')).toContain('Run npm start');
    expect(sections.get('expected behavior')).toBe('Page loads cleanly');
    expect(sections.get('actual behavior')).toBe('_No response_');
  });

  it('identifies missing and placeholder sections', () => {
    const body = `
### Version
2.1.0

### Steps to reproduce
N/A
`;

    const required = ['version', 'steps to reproduce', 'expected', 'actual'];
    const missing = checkMissingRequiredSections(body, required);

    // 'steps to reproduce' was placeholder (N/A), 'expected' and 'actual' were missing entirely
    expect(missing).toContain('steps to reproduce');
    expect(missing).toContain('expected');
    expect(missing).toContain('actual');
    expect(missing).not.toContain('version');
  });

  it('passes when all required sections are present with valid content', () => {
    const body = `
### Version
1.0.0

### Steps to reproduce
1. Clone repo
2. Run build

### Expected
Builds without error

### Actual
Stack trace in console
`;

    const required = ['version', 'steps to reproduce', 'expected', 'actual'];
    const missing = checkMissingRequiredSections(body, required);
    expect(missing).toEqual([]);
  });
});
