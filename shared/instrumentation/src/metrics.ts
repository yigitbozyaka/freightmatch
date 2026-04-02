import * as client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

export const kafkaMessagesSent = new client.Counter({
  name: 'kafka_messages_sent_total',
  help: 'Total number of Kafka messages sent',
  labelNames: ['topic'],
});

export const kafkaMessagesReceived = new client.Counter({
  name: 'kafka_messages_received_total',
  help: 'Total number of Kafka messages received',
  labelNames: ['topic', 'group_id'],
});

export const kafkaConsumerLag = new client.Gauge({
  name: 'kafka_consumer_lag',
  help: 'Kafka consumer lag',
  labelNames: ['topic', 'group_id'],
});

export const mongoOperations = new client.Counter({
  name: 'mongodb_operations_total',
  help: 'Total number of MongoDB operations',
  labelNames: ['operation', 'collection'],
});

export const mongoConnectionStatus = new client.Gauge({
  name: 'mongodb_connection_status',
  help: 'MongoDB connection status (1 = connected, 0 = disconnected)',
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(kafkaMessagesSent);
register.registerMetric(kafkaMessagesReceived);
register.registerMetric(kafkaConsumerLag);
register.registerMetric(mongoOperations);
register.registerMetric(mongoConnectionStatus);

export { register };

export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export function getContentType(): string {
  return register.contentType;
}
