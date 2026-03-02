import { userRepository } from '../repositories/user.repository';
import { ErrorCode } from '../types';

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
}

export const userService = new UserService();
