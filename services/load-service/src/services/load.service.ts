import { loadRepository } from '../repositories/load.repository';
import { ErrorCode } from '../types';

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

  async updateLoad(id: string, shipperId: string, updates: any) {
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

  async getAvailableLoads(filters?: { origin?: string; destination?: string; cargoType?: string }) {
    return loadRepository.findAvailable(filters);
  }

  async getLoadsByShipper(shipperId: string) {
    return loadRepository.findByShipperId(shipperId);
  }
}

export const loadService = new LoadService();
