import { User, IUser } from '../models/user.model';

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async create(data: { email: string; passwordHash: string; role: 'Shipper' | 'Carrier' }): Promise<IUser> {
    return User.create(data);
  }
}

export const userRepository = new UserRepository();
