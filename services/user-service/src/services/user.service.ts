import { userRepository } from '../repositories/user.repository';
import { ICarrierProfile, IUser } from '../models/user.model';
import { CarrierResponse, ErrorCode } from '../types';

export class UserService {
  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User not found') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 404;
      error.errorCode = ErrorCode.NOT_FOUND;
      throw error;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async upsertCarrierProfile(userId: string, profile: ICarrierProfile) {
    const user = await userRepository.upsertCarrierProfile(userId, profile);
    if (!user) {
      const error = new Error('User not found') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 404;
      error.errorCode = ErrorCode.NOT_FOUND;
      throw error;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      carrierProfile: user.carrierProfile ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async getAllCarriers(): Promise<CarrierResponse[]> {
    const carriers = await userRepository.findAllCarriers();
    return carriers.map((carrier) => this.toCarrierResponse(carrier));
  }

  async getCarrierById(id: string): Promise<CarrierResponse> {
    const carrier = await userRepository.findCarrierById(id);
    if (!carrier) {
      const error = new Error('Carrier not found') as Error & { statusCode: number; errorCode: string };
      error.statusCode = 404;
      error.errorCode = ErrorCode.NOT_FOUND;
      throw error;
    }

    return this.toCarrierResponse(carrier);
  }

  private toCarrierResponse(user: IUser): CarrierResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      carrierProfile: user.carrierProfile ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

export const userService = new UserService();
