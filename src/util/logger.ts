import * as core from '@actions/core';

/**
 * Utility logger wrapping GitHub Actions core methods with safe formatting.
 */
export const logger = {
  info(message: string): void {
    core.info(message);
  },
  debug(message: string): void {
    core.debug(message);
  },
  warn(message: string): void {
    core.warning(message);
  },
  error(message: string | Error): void {
    if (message instanceof Error) {
      core.error(message.stack || message.message);
    } else {
      core.error(message);
    }
  },
  startGroup(name: string): void {
    core.startGroup(name);
  },
  endGroup(): void {
    core.endGroup();
  },
};
