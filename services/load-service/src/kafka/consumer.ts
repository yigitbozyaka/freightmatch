import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS } from '@freightmatch/contracts';
import { env } from '../config/env';
import { loadService } from '../services/load.service';

const kafka = new Kafka({
  clientId: 'load-service',
  brokers: [env.KAFKA_BROKER],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

let consumer: Consumer;

export async function startConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: 'load-service-group' });
  await consumer.connect();

  await consumer.subscribe({ topic: KAFKA_TOPICS.BID_ACCEPTED, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (topic !== KAFKA_TOPICS.BID_ACCEPTED || !message.value) return;

      try {
        const event = JSON.parse(message.value.toString());
        console.log('Received bid.accepted event:', JSON.stringify(event));

        await loadService.transitionStatus(event.loadId, 'InTransit');
        console.log(`Load ${event.loadId} transitioned to InTransit via bid.accepted`);
      } catch (error) {
        console.error('Error processing bid.accepted event:', error);
      }
    },
  });

  console.log(`Kafka consumer started, listening for ${KAFKA_TOPICS.BID_ACCEPTED}`);
}

export async function disconnectConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    console.log('Kafka consumer disconnected');
  }
}
