import { z } from 'zod';
export declare const LabelRuleSchema: z.ZodObject<{
    label: z.ZodString;
    keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    patterns: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    keywords: string[];
    patterns: string[];
}, {
    label: string;
    keywords?: string[] | undefined;
    patterns?: string[] | undefined;
}>;
export declare const TriageDuplicatesSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    threshold: z.ZodDefault<z.ZodNumber>;
    maxSuggestions: z.ZodDefault<z.ZodNumber>;
    includeClosedDays: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    threshold: number;
    maxSuggestions: number;
    includeClosedDays: number;
}, {
    enabled?: boolean | undefined;
    threshold?: number | undefined;
    maxSuggestions?: number | undefined;
    includeClosedDays?: number | undefined;
}>;
export declare const WelcomeMessageSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    message: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    enabled: boolean;
}, {
    message?: string | undefined;
    enabled?: boolean | undefined;
}>;
export declare const TriageConfigSchema: z.ZodObject<{
    labels: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        patterns: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        keywords: string[];
        patterns: string[];
    }, {
        label: string;
        keywords?: string[] | undefined;
        patterns?: string[] | undefined;
    }>, "many">>;
    requiredInfo: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    needsInfoLabel: z.ZodDefault<z.ZodString>;
    duplicates: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        threshold: z.ZodDefault<z.ZodNumber>;
        maxSuggestions: z.ZodDefault<z.ZodNumber>;
        includeClosedDays: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        threshold: number;
        maxSuggestions: number;
        includeClosedDays: number;
    }, {
        enabled?: boolean | undefined;
        threshold?: number | undefined;
        maxSuggestions?: number | undefined;
        includeClosedDays?: number | undefined;
    }>>;
    welcomeMessage: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        message: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        enabled: boolean;
    }, {
        message?: string | undefined;
        enabled?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    labels: {
        label: string;
        keywords: string[];
        patterns: string[];
    }[];
    requiredInfo: Record<string, string[]>;
    needsInfoLabel: string;
    duplicates: {
        enabled: boolean;
        threshold: number;
        maxSuggestions: number;
        includeClosedDays: number;
    };
    welcomeMessage: {
        message: string;
        enabled: boolean;
    };
}, {
    labels?: {
        label: string;
        keywords?: string[] | undefined;
        patterns?: string[] | undefined;
    }[] | undefined;
    requiredInfo?: Record<string, string[]> | undefined;
    needsInfoLabel?: string | undefined;
    duplicates?: {
        enabled?: boolean | undefined;
        threshold?: number | undefined;
        maxSuggestions?: number | undefined;
        includeClosedDays?: number | undefined;
    } | undefined;
    welcomeMessage?: {
        message?: string | undefined;
        enabled?: boolean | undefined;
    } | undefined;
}>;
export declare const PullRequestsConfigSchema: z.ZodObject<{
    sizeThresholds: z.ZodDefault<z.ZodObject<{
        xs: z.ZodDefault<z.ZodNumber>;
        s: z.ZodDefault<z.ZodNumber>;
        m: z.ZodDefault<z.ZodNumber>;
        l: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        xs: number;
        s: number;
        m: number;
        l: number;
    }, {
        xs?: number | undefined;
        s?: number | undefined;
        m?: number | undefined;
        l?: number | undefined;
    }>>;
    testGlobs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    docsGlobs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    riskyGlobs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requireConventionalTitle: z.ZodDefault<z.ZodBoolean>;
    requireLinkedIssue: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sizeThresholds: {
        xs: number;
        s: number;
        m: number;
        l: number;
    };
    testGlobs: string[];
    docsGlobs: string[];
    riskyGlobs: string[];
    requireConventionalTitle: boolean;
    requireLinkedIssue: boolean;
}, {
    sizeThresholds?: {
        xs?: number | undefined;
        s?: number | undefined;
        m?: number | undefined;
        l?: number | undefined;
    } | undefined;
    testGlobs?: string[] | undefined;
    docsGlobs?: string[] | undefined;
    riskyGlobs?: string[] | undefined;
    requireConventionalTitle?: boolean | undefined;
    requireLinkedIssue?: boolean | undefined;
}>;
export declare const ReleaseCategorySchema: z.ZodObject<{
    title: z.ZodString;
    labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    types: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    labels: string[];
    title: string;
    types: string[];
}, {
    title: string;
    labels?: string[] | undefined;
    types?: string[] | undefined;
}>;
export declare const ReleaseConfigSchema: z.ZodObject<{
    categories: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        types: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        labels: string[];
        title: string;
        types: string[];
    }, {
        title: string;
        labels?: string[] | undefined;
        types?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    categories: {
        labels: string[];
        title: string;
        types: string[];
    }[];
}, {
    categories?: {
        title: string;
        labels?: string[] | undefined;
        types?: string[] | undefined;
    }[] | undefined;
}>;
export declare const MaintainerKitConfigSchema: z.ZodObject<{
    triage: z.ZodDefault<z.ZodObject<{
        labels: z.ZodDefault<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            patterns: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            keywords: string[];
            patterns: string[];
        }, {
            label: string;
            keywords?: string[] | undefined;
            patterns?: string[] | undefined;
        }>, "many">>;
        requiredInfo: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        needsInfoLabel: z.ZodDefault<z.ZodString>;
        duplicates: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            threshold: z.ZodDefault<z.ZodNumber>;
            maxSuggestions: z.ZodDefault<z.ZodNumber>;
            includeClosedDays: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            threshold: number;
            maxSuggestions: number;
            includeClosedDays: number;
        }, {
            enabled?: boolean | undefined;
            threshold?: number | undefined;
            maxSuggestions?: number | undefined;
            includeClosedDays?: number | undefined;
        }>>;
        welcomeMessage: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            message: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            message: string;
            enabled: boolean;
        }, {
            message?: string | undefined;
            enabled?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        labels: {
            label: string;
            keywords: string[];
            patterns: string[];
        }[];
        requiredInfo: Record<string, string[]>;
        needsInfoLabel: string;
        duplicates: {
            enabled: boolean;
            threshold: number;
            maxSuggestions: number;
            includeClosedDays: number;
        };
        welcomeMessage: {
            message: string;
            enabled: boolean;
        };
    }, {
        labels?: {
            label: string;
            keywords?: string[] | undefined;
            patterns?: string[] | undefined;
        }[] | undefined;
        requiredInfo?: Record<string, string[]> | undefined;
        needsInfoLabel?: string | undefined;
        duplicates?: {
            enabled?: boolean | undefined;
            threshold?: number | undefined;
            maxSuggestions?: number | undefined;
            includeClosedDays?: number | undefined;
        } | undefined;
        welcomeMessage?: {
            message?: string | undefined;
            enabled?: boolean | undefined;
        } | undefined;
    }>>;
    pullRequests: z.ZodDefault<z.ZodObject<{
        sizeThresholds: z.ZodDefault<z.ZodObject<{
            xs: z.ZodDefault<z.ZodNumber>;
            s: z.ZodDefault<z.ZodNumber>;
            m: z.ZodDefault<z.ZodNumber>;
            l: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            xs: number;
            s: number;
            m: number;
            l: number;
        }, {
            xs?: number | undefined;
            s?: number | undefined;
            m?: number | undefined;
            l?: number | undefined;
        }>>;
        testGlobs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        docsGlobs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        riskyGlobs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requireConventionalTitle: z.ZodDefault<z.ZodBoolean>;
        requireLinkedIssue: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        sizeThresholds: {
            xs: number;
            s: number;
            m: number;
            l: number;
        };
        testGlobs: string[];
        docsGlobs: string[];
        riskyGlobs: string[];
        requireConventionalTitle: boolean;
        requireLinkedIssue: boolean;
    }, {
        sizeThresholds?: {
            xs?: number | undefined;
            s?: number | undefined;
            m?: number | undefined;
            l?: number | undefined;
        } | undefined;
        testGlobs?: string[] | undefined;
        docsGlobs?: string[] | undefined;
        riskyGlobs?: string[] | undefined;
        requireConventionalTitle?: boolean | undefined;
        requireLinkedIssue?: boolean | undefined;
    }>>;
    release: z.ZodDefault<z.ZodObject<{
        categories: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            labels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
            types: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            labels: string[];
            title: string;
            types: string[];
        }, {
            title: string;
            labels?: string[] | undefined;
            types?: string[] | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        categories: {
            labels: string[];
            title: string;
            types: string[];
        }[];
    }, {
        categories?: {
            title: string;
            labels?: string[] | undefined;
            types?: string[] | undefined;
        }[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    triage: {
        labels: {
            label: string;
            keywords: string[];
            patterns: string[];
        }[];
        requiredInfo: Record<string, string[]>;
        needsInfoLabel: string;
        duplicates: {
            enabled: boolean;
            threshold: number;
            maxSuggestions: number;
            includeClosedDays: number;
        };
        welcomeMessage: {
            message: string;
            enabled: boolean;
        };
    };
    pullRequests: {
        sizeThresholds: {
            xs: number;
            s: number;
            m: number;
            l: number;
        };
        testGlobs: string[];
        docsGlobs: string[];
        riskyGlobs: string[];
        requireConventionalTitle: boolean;
        requireLinkedIssue: boolean;
    };
    release: {
        categories: {
            labels: string[];
            title: string;
            types: string[];
        }[];
    };
}, {
    triage?: {
        labels?: {
            label: string;
            keywords?: string[] | undefined;
            patterns?: string[] | undefined;
        }[] | undefined;
        requiredInfo?: Record<string, string[]> | undefined;
        needsInfoLabel?: string | undefined;
        duplicates?: {
            enabled?: boolean | undefined;
            threshold?: number | undefined;
            maxSuggestions?: number | undefined;
            includeClosedDays?: number | undefined;
        } | undefined;
        welcomeMessage?: {
            message?: string | undefined;
            enabled?: boolean | undefined;
        } | undefined;
    } | undefined;
    pullRequests?: {
        sizeThresholds?: {
            xs?: number | undefined;
            s?: number | undefined;
            m?: number | undefined;
            l?: number | undefined;
        } | undefined;
        testGlobs?: string[] | undefined;
        docsGlobs?: string[] | undefined;
        riskyGlobs?: string[] | undefined;
        requireConventionalTitle?: boolean | undefined;
        requireLinkedIssue?: boolean | undefined;
    } | undefined;
    release?: {
        categories?: {
            title: string;
            labels?: string[] | undefined;
            types?: string[] | undefined;
        }[] | undefined;
    } | undefined;
}>;
export type MaintainerKitConfig = z.infer<typeof MaintainerKitConfigSchema>;
export type TriageConfig = z.infer<typeof TriageConfigSchema>;
export type PullRequestsConfig = z.infer<typeof PullRequestsConfigSchema>;
export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>;
export type LabelRule = z.infer<typeof LabelRuleSchema>;
/**
 * Normalizes snake-case or kebab-case keys from raw YAML into camelCase
 * to accept standard user YAML inputs like `required-info` and `size-thresholds`.
 */
export declare function normalizeRawConfig(raw: unknown): unknown;
/**
 * Parse and validate configuration object with descriptive error messages.
 */
export declare function parseConfig(rawYamlObject: unknown): MaintainerKitConfig;
