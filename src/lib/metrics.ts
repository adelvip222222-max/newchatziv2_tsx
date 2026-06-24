import { logger } from "@/lib/logger";

/**
 * Structured observability metrics.
 *
 * Emits JSON log lines that can be scraped by Datadog, Grafana Loki,
 * CloudWatch, or any structured-log aggregator.
 * All metric events use the "metric.*" event prefix for easy filtering.
 */

export function recordQueueDepth(queueName: string, counts: {
  waiting?: number;
  active?: number;
  delayed?: number;
  failed?: number;
  paused?: number;
}) {
  logger.info("metric.queue_depth", { queueName, ...counts });
}

export function recordJobCompleted(queueName: string, jobName: string, durationMs: number) {
  logger.info("metric.job_completed", { queueName, jobName, durationMs });
}

export function recordJobFailed(queueName: string, jobName: string, reason: string) {
  logger.warn("metric.job_failed", { queueName, jobName, reason });
}

export function recordAiLatency(options: {
  tenantId: string;
  provider: string;
  model: string;
  latencyMs: number;
  tokenEstimate?: number;
  promptCacheHit?: boolean;
}) {
  logger.info("metric.ai_latency", options);
}

export function recordWebhookRateLimitHit(provider: string, ip: string) {
  logger.warn("metric.webhook_rate_limit_hit", { provider, ip });
}

export function recordRealtimeConnections(tenantId: string, count: number) {
  logger.info("metric.realtime_connections", { tenantId, count });
}

export function recordQuotaUsage(tenantId: string, used: number, limit: number) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  logger.info("metric.quota_usage", { tenantId, used, limit, pct });
  if (pct >= 90) {
    logger.warn("metric.quota_near_limit", { tenantId, used, limit, pct });
  }
}

export function recordDbQueryLatency(collection: string, operation: string, durationMs: number) {
  if (durationMs > 200) {
    logger.warn("metric.slow_db_query", { collection, operation, durationMs });
  }
}
