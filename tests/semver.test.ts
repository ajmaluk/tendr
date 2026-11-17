import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  bumpVersion,
  determineBumpType,
} from '../src/release/semver';

describe('Semver Bump Logic', () => {
  it('parses semver with or without v prefix', () => {
    expect(parseSemver('v1.2.3')).toEqual({
      hasVPrefix: true,
      major: 1,
      minor: 2,
      patch: 3,
    });
    expect(parseSemver('2.4.10')).toEqual({
      hasVPrefix: false,
      major: 2,
      minor: 4,
      patch: 10,
    });
    expect(parseSemver('invalid')).toBeNull();
  });

  it('bumps major, minor, and patch preserving prefix', () => {
    expect(bumpVersion('v1.2.3', 'major')).toBe('v2.0.0');
    expect(bumpVersion('v1.2.3', 'minor')).toBe('v1.3.0');
    expect(bumpVersion('v1.2.3', 'patch')).toBe('v1.2.4');

    expect(bumpVersion('1.0.5', 'minor')).toBe('1.1.0');
  });

  it('defaults to v1.0.0 when no previous version exists', () => {
    expect(bumpVersion(null, 'minor')).toBe('v1.0.0');
    expect(bumpVersion(undefined, 'patch')).toBe('v1.0.0');
  });

  it('determines bump type correctly based on PR characteristics', () => {
    // Breaking change present -> major
    expect(
      determineBumpType([
        { isBreaking: false, type: 'feat' },
        { isBreaking: true, type: 'fix' },
      ]),
    ).toBe('major');

    // Feat present -> minor
    expect(
      determineBumpType([
        { isBreaking: false, type: 'fix' },
        { isBreaking: false, type: 'feat' },
        { isBreaking: false, type: 'chore' },
      ]),
    ).toBe('minor');

    // Only fixes or chores -> patch
    expect(
      determineBumpType([
        { isBreaking: false, type: 'fix' },
        { isBreaking: false, type: 'docs' },
      ]),
    ).toBe('patch');
  });
});
