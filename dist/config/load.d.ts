import { MaintainerKitConfig } from './schema';
export interface ConfigFetcher {
    getFileContent(path: string): Promise<string | null>;
}
/**
 * Loads and parses MaintainerKit configuration.
 * If the config file does not exist, returns safe default configuration.
 * If the config file exists but has syntax or schema errors, throws a descriptive error.
 */
export declare function loadConfig(fetcher: ConfigFetcher, configPath: string): Promise<MaintainerKitConfig>;
