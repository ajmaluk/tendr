import { MaintainerKitConfig } from './schema';
export interface ConfigFetcher {
    getFileContent(path: string): Promise<string | null>;
}
/**
 * Loads and parses Tendr configuration.
 * If the config file does not exist (404), returns safe default configuration.
 * If the config file exists but has syntax or schema errors, or fails with 403/500, throws a descriptive error.
 */
export declare function loadConfig(fetcher: ConfigFetcher, configPath: string): Promise<MaintainerKitConfig>;
