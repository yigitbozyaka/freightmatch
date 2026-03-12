// franz kafka says hi 🪳

import { Kafka, Producer } from 'kafkajs';
import { env } from '../config/env';

const kafka = new Kafka({
  clientId: 'bidding-service',
  brokers: [env.KAFKA_BROKER],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

let producer: Producer;

export async function connectProducer(): Promise<void> {
  producer = kafka.producer();
  await producer.connect();
  console.log('Kafka producer connected');
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    console.log('Kafka producer disconnected');
  }
}

export async function publishEvent(topic: string, payload: Record<string, unknown>): Promise<void> {
  await producer.send({
    topic,
    messages: [
      {
        key: String(payload.loadId ?? ''),
        value: JSON.stringify(payload),
      },
    ],
  });
  console.log(`Published event to ${topic}:`, JSON.stringify(payload));
}
