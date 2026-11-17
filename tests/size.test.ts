import { describe, it, expect } from 'vitest';
import {
  calculateSizeLabel,
  determineOutdatedSizeLabels,
} from '../src/pr/size';

describe('PR Size Calculation', () => {
  it('correctly maps line changes to size labels based on thresholds', () => {
    expect(calculateSizeLabel(0)).toBe('size/XS');
    expect(calculateSizeLabel(10)).toBe('size/XS');
    expect(calculateSizeLabel(11)).toBe('size/S');
    expect(calculateSizeLabel(50)).toBe('size/S');
    expect(calculateSizeLabel(51)).toBe('size/M');
    expect(calculateSizeLabel(250)).toBe('size/M');
    expect(calculateSizeLabel(251)).toBe('size/L');
    expect(calculateSizeLabel(1000)).toBe('size/L');
    expect(calculateSizeLabel(1001)).toBe('size/XL');
    expect(calculateSizeLabel(50000)).toBe('size/XL');
  });

  it('respects custom size thresholds', () => {
    const custom = { xs: 5, s: 20, m: 100, l: 500 };
    expect(calculateSizeLabel(6, custom)).toBe('size/S');
    expect(calculateSizeLabel(150, custom)).toBe('size/L');
  });

  it('detects outdated size labels for cleanup upon synchronization', () => {
    const existing = ['bug', 'size/S', 'frontend'];
    const outdated = determineOutdatedSizeLabels(existing, 'size/M');
    expect(outdated).toEqual(['size/S']);

    // When the size label hasn't changed
    expect(determineOutdatedSizeLabels(existing, 'size/S')).toEqual([]);
  });
});
