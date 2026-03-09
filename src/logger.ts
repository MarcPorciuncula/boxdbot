import * as Sentry from "@sentry/cloudflare";

export const logger = {
  debug: (message: string, attrs?: Record<string, unknown>) =>
    Sentry.logger.debug(message, attrs),
  info: (message: string, attrs?: Record<string, unknown>) =>
    Sentry.logger.info(message, attrs),
  warn: (message: string, attrs?: Record<string, unknown>) =>
    Sentry.logger.warn(message, attrs),
  error: (message: string, attrs?: Record<string, unknown>) =>
    Sentry.logger.error(message, attrs),
};

export function captureException(err: unknown) {
  Sentry.captureException(err);
}

export function withContext<T>(
  attrs: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.withIsolationScope((scope) => {
    for (const [key, value] of Object.entries(attrs)) {
      scope.setTag(key, value);
    }
    return fn();
  });
}
