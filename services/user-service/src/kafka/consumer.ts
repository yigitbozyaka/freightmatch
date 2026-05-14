import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS } from '@freightmatch/contracts';
import { env } from '../config/env';
import { userService } from '../services/user.service';

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [env.KAFKA_BROKER],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

let consumer: Consumer;

export async function startConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: 'user-service-group' });
  await consumer.connect();

  await consumer.subscribe({ topic: KAFKA_TOPICS.LOAD_DELIVERED, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (topic !== KAFKA_TOPICS.LOAD_DELIVERED || !message.value) return;

      try {
        const event = JSON.parse(message.value.toString());
        console.log(`Received ${KAFKA_TOPICS.LOAD_DELIVERED} event for load ${event.loadId}`);

        await userService.recordDelivery(event.carrierId, event.onTime, event.actualHours);
      } catch (error) {
        console.error('Error processing load.delivered event:', error);
      }
    },
  });

  console.log(`Kafka consumer started, listening for ${KAFKA_TOPICS.LOAD_DELIVERED}`);
}

export async function disconnectConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    console.log('Kafka consumer disconnected');
  }
}
