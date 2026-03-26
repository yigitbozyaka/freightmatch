import { env } from '../config/env';
import { Recommendation } from '../models/recommendation.model';
import { getRecommendations } from './claude.service';
import { CarrierResponse, ErrorCode, LoadCreatedEvent } from '../types';

async function fetchCarriers(): Promise<CarrierResponse[]> {
  const response = await fetch(`${env.USER_SERVICE_URL}/api/users/carriers`, {
    headers: { 'x-internal-request': 'matching-service' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch carriers: ${response.status}`);
  }

  return (await response.json()) as CarrierResponse[];
}

export class MatchingService {
  async generateRecommendations(load: LoadCreatedEvent): Promise<void> {
    const existing = await Recommendation.findOne({ loadId: load.loadId });
    if (existing) {
      console.log(`Recommendations already exist for load ${load.loadId}, skipping`);
      return;
    }

    console.log(`Generating recommendations for load ${load.loadId}`);

    const carriers = await fetchCarriers();
    const recommendations = await getRecommendations(load, carriers);

    await Recommendation.create({
      loadId: load.loadId,
      recommendations,
      generatedAt: new Date(),
    });

    console.log(`Stored ${recommendations.length} recommendations for load ${load.loadId}`);
  }

  async getByLoadId(loadId: string) {
    const result = await Recommendation.findOne({ loadId });
    if (!result) {
      const error = new Error('Recommendations not found for this load') as Error & {
        statusCode: number;
        errorCode: string;
      };
      error.statusCode = 404;
      error.errorCode = ErrorCode.NOT_FOUND;
      throw error;
    }
    return result;
  }

  async manualRecommend(load: LoadCreatedEvent) {
    const carriers = await fetchCarriers();
    const recommendations = await getRecommendations(load, carriers);

    const result = await Recommendation.findOneAndUpdate(
      { loadId: load.loadId },
      {
        loadId: load.loadId,
        recommendations,
        generatedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return result;
  }
}

export const matchingService = new MatchingService();
