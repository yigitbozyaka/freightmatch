import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS } from '@freightmatch/contracts';
import { env } from '../config/env';
import { matchingService } from '../services/matching.service';
import { LoadCreatedEvent } from '../types';

const kafka = new Kafka({
  clientId: 'matching-service',
  brokers: [env.KAFKA_BROKER],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

let consumer: Consumer;

export async function startConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: 'matching-service-group' });
  await consumer.connect();

  await consumer.subscribe({ topic: KAFKA_TOPICS.LOAD_CREATED, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (topic !== KAFKA_TOPICS.LOAD_CREATED || !message.value) return;

      try {
        const event: LoadCreatedEvent = JSON.parse(message.value.toString());
        console.log(`Received ${KAFKA_TOPICS.LOAD_CREATED} event for load ${event.loadId}`);

        await matchingService.generateRecommendations(event);
      } catch (error) {
        console.error('Error processing load.created event:', error);
      }
    },
  });

  console.log(`Kafka consumer started, listening for ${KAFKA_TOPICS.LOAD_CREATED}`);
}

export async function disconnectConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    console.log('Kafka consumer disconnected');
  }
}
