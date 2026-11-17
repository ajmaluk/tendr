import * as yaml from 'yaml';
import { MaintainerKitConfig, parseConfig } from './schema';
import { logger } from '../util/logger';

export interface ConfigFetcher {
  getFileContent(path: string): Promise<string | null>;
}

async function fetchConfigContent(fetcher: ConfigFetcher, path: string): Promise<string | null> {
  try {
    return await fetcher.getFileContent(path);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 404) {
      return null;
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load configuration file (${path}): ${errorMsg}`);
  }
}

/**
 * Loads and parses Tendr configuration.
 * If the config file does not exist (404), returns safe default configuration.
 * If the config file exists but has syntax or schema errors, or fails with 403/500, throws a descriptive error.
 */
export async function loadConfig(
  fetcher: ConfigFetcher,
  configPath: string,
): Promise<MaintainerKitConfig> {
  logger.info(`Loading configuration from: ${configPath}`);

  let rawContent = await fetchConfigContent(fetcher, configPath);

  // Backward compatibility: fallback between .github/tendr.yml and .github/maintainerkit.yml
  if (!rawContent && (configPath === '.github/tendr.yml' || configPath === '.github/maintainerkit.yml')) {
    const fallbackPath =
      configPath === '.github/tendr.yml' ? '.github/maintainerkit.yml' : '.github/tendr.yml';
    try {
      rawContent = await fetchConfigContent(fetcher, fallbackPath);
      if (rawContent) {
        logger.info(`Loaded configuration from fallback path: ${fallbackPath}`);
      }
    } catch {
      // Fallback failure is non-fatal if default was missing
    }
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
