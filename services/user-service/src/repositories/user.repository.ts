import { User, IUser, ICarrierProfile, IShipperProfile } from '../models/user.model';

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

  async upsertShipperProfile(userId: string, profile: IShipperProfile): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      { $set: { shipperProfile: profile } },
      { new: true },
    );
  }

  async updateProfilePhotoUrl(userId: string, role: 'Shipper' | 'Carrier', url: string): Promise<IUser | null> {
    const field = role === 'Carrier' ? 'carrierProfile.profilePhotoUrl' : 'shipperProfile.profilePhotoUrl';
    return User.findByIdAndUpdate(userId, { $set: { [field]: url } }, { new: true });
  }

  async findAllCarriers(): Promise<IUser[]> {
    return User.find({ role: 'Carrier' }).select('-passwordHash');
  }

  async findCarrierById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, role: 'Carrier' }).select('-passwordHash');
  }

  async updateLoginAttempts(
    userId: string,
    update: { failedLoginAttempts: number; lockUntil?: Date },
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, { $set: update });
  }
}

export const userRepository = new UserRepository();
