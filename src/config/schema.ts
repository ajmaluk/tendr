import { z } from 'zod';

export const LabelRuleSchema = z.object({
  label: z.string().min(1, 'Label name cannot be empty'),
  keywords: z.array(z.string().min(1)).default([]),
  patterns: z.array(z.string().min(1)).optional().default([]),
});

export const TriageDuplicatesSchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z.number().min(0).max(1).default(0.55),
  maxSuggestions: z.number().int().positive().default(3),
  includeClosedDays: z.number().int().nonnegative().default(180),
});

export const WelcomeMessageSchema = z.object({
  enabled: z.boolean().default(false),
  message: z.string().default('Thank you for opening your first issue! Welcome to our community.'),
});

export const TriageConfigSchema = z.object({
  labels: z.array(LabelRuleSchema).default([
    {
      label: 'bug',
      keywords: [
        'crash',
        'exception',
        'traceback',
        "doesn't work",
        'regression',
        'broken',
        'not working',
        'error',
        'fails',
        'failure',
      ],
      patterns: [],
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
  ]),
  requiredInfo: z.record(z.array(z.string())).default({
    bug: ['version', 'steps to reproduce', 'expected', 'actual'],
  }),
  needsInfoLabel: z.string().default('needs-info'),
  duplicates: TriageDuplicatesSchema.default({}),
  welcomeMessage: WelcomeMessageSchema.default({}),
});

export const PullRequestsConfigSchema = z.object({
  sizeThresholds: z
    .object({
      xs: z.number().default(10),
      s: z.number().default(50),
      m: z.number().default(250),
      l: z.number().default(1000),
    })
    .default({}),
  testGlobs: z
    .array(z.string())
    .default(['**/*.test.*', '**/*.spec.*', 'tests/**', '__tests__/**']),
  docsGlobs: z.array(z.string()).default(['README.md', 'docs/**', 'CHANGELOG.md']),
  riskyGlobs: z
    .array(z.string())
    .default(['**/auth/**', '**/migrations/**', '.github/workflows/**', 'package-lock.json']),
  requireConventionalTitle: z.boolean().default(true),
  requireLinkedIssue: z.boolean().default(false),
});

export const ReleaseCategorySchema = z.object({
  title: z.string().min(1),
  labels: z.array(z.string()).optional().default([]),
  types: z.array(z.string()).optional().default([]),
});

export const ReleaseConfigSchema = z.object({
  excludeBots: z.boolean().default(false),
  categories: z.array(ReleaseCategorySchema).default([
    { title: 'Breaking Changes', labels: ['breaking'], types: [] },
    { title: 'Features', labels: ['enhancement'], types: ['feat'] },
    { title: 'Bug Fixes', labels: ['bug'], types: ['fix'] },
    { title: 'Documentation', labels: [], types: ['docs'] },
    {
      title: 'Maintenance',
      labels: [],
      types: ['chore', 'refactor', 'ci', 'build', 'test'],
    },
  ]),
});

export const TendrConfigSchema = z.object({
  triage: TriageConfigSchema.default({}),
  pullRequests: PullRequestsConfigSchema.default({}),
  release: ReleaseConfigSchema.default({}),
});

export const MaintainerKitConfigSchema = TendrConfigSchema;

export type TendrConfig = z.infer<typeof TendrConfigSchema>;
export type MaintainerKitConfig = TendrConfig;
export type TriageConfig = z.infer<typeof TriageConfigSchema>;
export type PullRequestsConfig = z.infer<typeof PullRequestsConfigSchema>;
export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>;
export type LabelRule = z.infer<typeof LabelRuleSchema>;

/**
 * Normalizes snake-case or kebab-case keys from raw YAML into camelCase
 * to accept standard user YAML inputs like `required-info` and `size-thresholds`.
 */
export function normalizeRawConfig(raw: unknown): unknown {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return raw;
  }

  if (Array.isArray(raw)) {
    return raw.map(normalizeRawConfig);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    // Convert kebab-case and snake_case to camelCase
    const camelKey = key.replace(/[-_]([a-z0-9])/gi, (_, char) => char.toUpperCase());
    result[camelKey] = normalizeRawConfig(value);
  }
  return result;
}

/**
 * Parse and validate configuration object with descriptive error messages.
 */
export function parseConfig(rawYamlObject: unknown): MaintainerKitConfig {
  const normalized = normalizeRawConfig(rawYamlObject ?? {});
  const parsed = MaintainerKitConfigSchema.safeParse(normalized);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - Key: "${issue.path.join('.')}" | Expected: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid Tendr (MaintainerKit) configuration in config file:\n${errorDetails}\nPlease review the configuration reference in docs/configuration.md.`,
    );
  }

  return parsed.data;
}
