import { Kafka, Producer, Consumer, logLevel, Partitioners } from 'kafkajs';
import { kafkaMessagesSent, kafkaMessagesReceived, kafkaConsumerLag } from './metrics';
import { logger } from './logger';

const kafka = new Kafka({
  clientId: process.env.SERVICE_NAME || 'freightmatch',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 5,
  },
});

export const kafkaProducer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
  allowAutoTopicCreation: true,
});

export const kafkaConsumers: Map<string, Consumer> = new Map();

export async function connectProducer(): Promise<void> {
  await kafkaProducer.connect();
  logger.info('Kafka producer connected');
}

export async function disconnectProducer(): Promise<void> {
  await kafkaProducer.disconnect();
  logger.info('Kafka producer disconnected');
}

export async function sendMessage(topic: string, message: Record<string, unknown>): Promise<void> {
  await kafkaProducer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  kafkaMessagesSent.inc({ topic });
  logger.info('Kafka message sent', { topic });
}

export async function createConsumer(groupId: string, topics: string[]): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  logger.info('Kafka consumer connected', { groupId });

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  kafkaConsumers.set(groupId, consumer);
  return consumer;
}

export async function disconnectConsumer(groupId: string): Promise<void> {
  const consumer = kafkaConsumers.get(groupId);
  if (consumer) {
    await consumer.disconnect();
    kafkaConsumers.delete(groupId);
    logger.info('Kafka consumer disconnected', { groupId });
  }
}

export { kafka };
