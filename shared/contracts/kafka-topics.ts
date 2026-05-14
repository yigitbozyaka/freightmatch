export const KAFKA_TOPICS = {
  LOAD_CREATED: 'load.created',
  BID_ACCEPTED: 'bid.accepted',
  LOAD_DELIVERED: 'load.delivered',
} as const;

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];
