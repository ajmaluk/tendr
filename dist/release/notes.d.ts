import { ClassifiedPR } from './classify';
import { ReleaseConfig } from '../config/schema';
export interface ReleaseNotesOptions {
    version: string;
    previousVersion?: string;
    classifiedPRs: ClassifiedPR[];
    config: ReleaseConfig;
    firstTimeContributors?: Array<{
        author: string;
        prNumber: number;
    }>;
}
/**
 * Generates release notes in Markdown grouped by category, with a New Contributors section.
 */
export declare function generateReleaseNotes(options: ReleaseNotesOptions): string;
