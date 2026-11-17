export interface SummaryActionItem {
    type: 'label' | 'comment' | 'duplicate' | 'pr-check' | 'release';
    title: string;
    details?: string;
    status: 'applied' | 'would-apply' | 'skipped' | 'failed' | 'info';
}
export declare class StepSummaryManager {
    private items;
    private dryRun;
    constructor(dryRun?: boolean);
    setDryRun(dryRun: boolean): void;
    addItem(item: SummaryActionItem): void;
    write(): Promise<void>;
}
export declare const stepSummary: StepSummaryManager;
