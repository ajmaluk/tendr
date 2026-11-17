/**
 * Utility logger wrapping GitHub Actions core methods with safe formatting.
 */
export declare const logger: {
    info(message: string): void;
    debug(message: string): void;
    warn(message: string): void;
    error(message: string | Error): void;
    startGroup(name: string): void;
    endGroup(): void;
};
