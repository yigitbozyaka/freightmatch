// Metrics (Prometheus)
export {
  register,
  httpRequestDuration,
  httpRequestTotal,
  kafkaMessagesSent,
  kafkaMessagesReceived,
  kafkaConsumerLag,
  mongoOperations,
  mongoConnectionStatus,
  getMetrics,
  getContentType,
} from './metrics';

// Logging (Winston + Loki)
export { logger, createChildLogger } from './logger';

// Tracing (OpenTelemetry)
export {
  initTracing,
  getTracer,
  getCurrentSpan,
  addSpanAttributes,
  recordError,
  createSpan,
  shutdownTracing,
} from './tracing';

// Health checks
export {
  createHealthCheck,
  formatHealthResponse,
  type HealthCheck,
  type HealthCheckResult,
  type HealthStatus,
} from './health';

// Resilience patterns
export { CircuitBreaker, retry, RateLimiter } from './resilience';
export type { CircuitState, CircuitBreakerOptions } from './resilience';
