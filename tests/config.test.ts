import { describe, it, expect } from 'vitest';
import { parseConfig } from '../src/config/schema';
import { loadConfig } from '../src/config/load';

describe('Config Schema & Loading', () => {
  it('loads sensible defaults when empty config is provided', () => {
    const config = parseConfig({});
    expect(config.triage.labels.length).toBeGreaterThan(0);
    expect(config.triage.labels.some((l) => l.label === 'bug')).toBe(true);
    expect(config.triage.needsInfoLabel).toBe('needs-info');
    expect(config.pullRequests.sizeThresholds.xs).toBe(10);
    expect(config.release.categories.length).toBeGreaterThan(0);
  });

  it('normalizes kebab-case YAML keys to camelCase', () => {
    const raw = {
      'triage': {
        'needs-info-label': 'more-details-needed',
        'required-info': {
          'bug': ['repro', 'logs'],
        },
        'duplicates': {
          'include-closed-days': 90,
          'max-suggestions': 5,
        },
      },
      'pull-requests': {
        'size-thresholds': { 'xs': 5, 's': 25 },
        'require-conventional-title': false,
      },
    };

    const config = parseConfig(raw);
    expect(config.triage.needsInfoLabel).toBe('more-details-needed');
    expect(config.triage.requiredInfo['bug']).toEqual(['repro', 'logs']);
    expect(config.triage.duplicates.includeClosedDays).toBe(90);
    expect(config.triage.duplicates.maxSuggestions).toBe(5);
    expect(config.pullRequests.sizeThresholds.xs).toBe(5);
    expect(config.pullRequests.requireConventionalTitle).toBe(false);
  });

  it('throws descriptive error on invalid config schema', () => {
    const invalidConfig = {
      triage: {
        labels: [
          { label: '', keywords: [] }, // label empty
        ],
        duplicates: {
          threshold: 1.5, // > 1
        },
      },
    };

    expect(() => parseConfig(invalidConfig)).toThrowError(/Invalid.*configuration/i);
  });

  it('loadConfig returns default config when file is missing (404/null)', async () => {
    const mockFetcher = {
      getFileContent: async () => null,
    };

    const config = await loadConfig(mockFetcher, '.github/maintainerkit.yml');
    expect(config.triage.needsInfoLabel).toBe('needs-info');
    expect(config.triage.labels[0].label).toBe('bug');
  });

  it('loadConfig throws actionable error on invalid YAML syntax', async () => {
    const mockFetcher = {
      getFileContent: async () => 'triage:\n  labels: [unclosed list',
    };

    await expect(loadConfig(mockFetcher, '.github/maintainerkit.yml')).rejects.toThrow(
      /Failed to parse YAML/,
    );
  });
});
