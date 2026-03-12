import { KAFKA_TOPICS } from '@freightmatch/contracts';
import { loadRepository } from '../repositories/load.repository';
import { ErrorCode, LoadUpdateData } from '../types';
import { LoadStatus, VALID_TRANSITIONS } from '../models/load.model';
import { publishEvent } from '../kafka/producer';

export class LoadService {
  async createLoad(shipperId: string, data: {
    title: string;
    origin: string;
    destination: string;
    cargoType: string;
    weightKg: number;
    deadlineHours: number;
  }) {
    return loadRepository.create({
      ...data,
      shipperId,
      status: 'Draft',
    });
  }

  async getLoadById(id: string) {
    const load = await loadRepository.findById(id);
    if (!load) {
      const error = new Error('Load not found') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 404;
      error.errorCode = ErrorCode.NOT_FOUND;
      throw error;
    }
    return load;
  }

  async updateLoad(id: string, shipperId: string, updates: LoadUpdateData) {
    const load = await this.getLoadById(id);

    if (load.shipperId !== shipperId) {
      const error = new Error('Not authorized to update this load') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 403;
      error.errorCode = ErrorCode.FORBIDDEN;
      throw error;
    }

    if (load.status !== 'Draft') {
      const error = new Error('Only Draft loads can be updated') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 400;
      error.errorCode = ErrorCode.VALIDATION_ERROR;
      throw error;
    }

    const updatedLoad = await loadRepository.update(id, updates);
    return updatedLoad;
  }

  async deleteLoad(id: string, shipperId: string) {
    const load = await this.getLoadById(id);

    if (load.shipperId !== shipperId) {
      const error = new Error('Not authorized to delete this load') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 403;
      error.errorCode = ErrorCode.FORBIDDEN;
      throw error;
    }

    if (load.status !== 'Draft') {
      const error = new Error('Only Draft loads can be deleted') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 400;
      error.errorCode = ErrorCode.VALIDATION_ERROR;
      throw error;
    }

    await loadRepository.delete(id);
    return { success: true };
  }

  async updateStatus(id: string, shipperId: string, newStatus: LoadStatus) {
    const load = await this.getLoadById(id);

    if (load.shipperId !== shipperId) {
      const error = new Error('Not authorized to update this load') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 403;
      error.errorCode = ErrorCode.FORBIDDEN;
      throw error;
    }

    this.validateTransition(load.status, newStatus);

    const updatedLoad = await loadRepository.updateStatus(id, load.status, newStatus);

    if (newStatus === 'Posted' && updatedLoad) {
      await publishEvent(KAFKA_TOPICS.LOAD_CREATED, {
        eventType: KAFKA_TOPICS.LOAD_CREATED,
        loadId: updatedLoad._id.toString(),
        origin: updatedLoad.origin,
        destination: updatedLoad.destination,
        cargoType: updatedLoad.cargoType,
        weightKg: updatedLoad.weightKg,
        deadlineHours: updatedLoad.deadlineHours,
        shipperId: updatedLoad.shipperId,
        timestamp: new Date().toISOString(),
      });
    }

    return updatedLoad;
  }

  async transitionStatus(id: string, newStatus: LoadStatus) {
    const load = await this.getLoadById(id);
    this.validateTransition(load.status, newStatus);
    return loadRepository.updateStatus(id, load.status, newStatus);
  }

  private validateTransition(currentStatus: LoadStatus, newStatus: LoadStatus): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      const error = new Error(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      ) as Error & { statusCode: number; errorCode: string };
      error.statusCode = 409;
      error.errorCode = ErrorCode.CONFLICT;
      throw error;
    }
  }

  async getAvailableLoads(filters?: { origin?: string; destination?: string; cargoType?: string }) {
    return loadRepository.findAvailable(filters);
  }

  async getLoadsByShipper(shipperId: string) {
    return loadRepository.findByShipperId(shipperId);
  }
}

export const loadService = new LoadService();
