import { User, IUser, ICarrierProfile } from '../models/user.model';

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

  async upsertCarrierProfile(userId: string, profile: ICarrierProfile): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      { $set: { carrierProfile: profile } },
      { new: true },
    );
  }

  async findAllCarriers(): Promise<IUser[]> {
    return User.find({ role: 'Carrier' }).select('-passwordHash');
  }

  async findCarrierById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, role: 'Carrier' }).select('-passwordHash');
  }
}

export const userRepository = new UserRepository();
