import * as yaml from 'yaml';
import { MaintainerKitConfig, parseConfig } from './schema';
import { logger } from '../util/logger';

export interface ConfigFetcher {
  getFileContent(path: string): Promise<string | null>;
}

/**
 * Loads and parses MaintainerKit configuration.
 * If the config file does not exist, returns safe default configuration.
 * If the config file exists but has syntax or schema errors, throws a descriptive error.
 */
export async function loadConfig(
  fetcher: ConfigFetcher,
  configPath: string,
): Promise<MaintainerKitConfig> {
  logger.info(`Loading configuration from: ${configPath}`);

  let rawContent: string | null = null;
  try {
    rawContent = await fetcher.getFileContent(configPath);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to retrieve configuration file (${configPath}): ${errorMsg}`);
  }

  if (!rawContent || rawContent.trim().length === 0) {
    logger.info(`No configuration file found at ${configPath}. Using defaults.`);
    return parseConfig({});
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = yaml.parse(rawContent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML from ${configPath}: ${message}`);
  }

  try {
    const validated = parseConfig(parsedYaml);
    logger.info(`Configuration successfully loaded and validated.`);
    return validated;
  } catch (err: unknown) {
    logger.error(`Validation error in ${configPath}`);
    throw err;
  }
}
