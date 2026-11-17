import { describe, it, expect } from 'vitest';
import { tokenize, countTokens } from '../src/text/tokenize';

describe('Text Tokenization', () => {
  it('strips code blocks, inline code, and URLs', () => {
    const text = `
Here is a bug report:
\`\`\`js
const x = crashApp();
console.log(x);
\`\`\`
Visit https://example.com/logs or read \`config.json\`.
`;

    const tokens = tokenize(text);
    expect(tokens).toContain('bug');
    expect(tokens).toContain('report');
    expect(tokens).not.toContain('crashapp');
    expect(tokens).not.toContain('https');
    expect(tokens).not.toContain('config.json');
  });

  it('filters out English stopwords and short tokens', () => {
    const text = 'The application is not working and it crashes because of that';
    const tokens = tokenize(text);

    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('is');
    expect(tokens).not.toContain('not');
    expect(tokens).not.toContain('and');
    expect(tokens).not.toContain('it');
    expect(tokens).not.toContain('of');

    expect(tokens).toContain('application');
    expect(tokens).toContain('working');
    expect(tokens).toContain('crashes');
  });

  it('counts token frequencies accurately', () => {
    const tokens = ['crash', 'login', 'crash', 'button'];
    const counts = countTokens(tokens);

    expect(counts.get('crash')).toBe(2);
    expect(counts.get('login')).toBe(1);
    expect(counts.get('button')).toBe(1);
  });
});
