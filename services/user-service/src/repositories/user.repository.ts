import { User, IUser, ICarrierProfile, IShipperProfile } from '../models/user.model';
import { computeTrustScore } from '../utils/trust-score.util';

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

  async upsertCarrierProfile(userId: string, profile: Partial<ICarrierProfile>): Promise<IUser | null> {
    const update = Object.fromEntries(
      Object.entries(profile).map(([k, v]) => [`carrierProfile.${k}`, v])
    );
    return User.findOneAndUpdate(
      { _id: userId, role: 'Carrier' },
      { $set: update },
      { new: true },
    );
  }

  async upsertShipperProfile(userId: string, profile: Partial<IShipperProfile>): Promise<IUser | null> {
    const update = Object.fromEntries(
      Object.entries(profile).map(([k, v]) => [`shipperProfile.${k}`, v])
    );
    return User.findOneAndUpdate(
      { _id: userId, role: 'Shipper' },
      { $set: update },
      { new: true },
    );
  }

  async updateProfilePhotoUrl(userId: string, role: 'Shipper' | 'Carrier', url: string): Promise<{ user: IUser | null, oldPhotoUrl: string | null }> {
    const user = await User.findById(userId);
    if (!user) return { user: null, oldPhotoUrl: null };

    let oldPhotoUrl: string | null = null;
    if (role === 'Carrier') {
      if (!user.carrierProfile) {
        throw new Error('Profile must be created before uploading a photo');
      }
      oldPhotoUrl = user.carrierProfile.profilePhotoUrl;
      user.carrierProfile.profilePhotoUrl = url;
    } else {
      if (!user.shipperProfile) {
        throw new Error('Profile must be created before uploading a photo');
      }
      oldPhotoUrl = user.shipperProfile.profilePhotoUrl;
      user.shipperProfile.profilePhotoUrl = url;
    }

    await user.save();
    return { user, oldPhotoUrl };
  }

  async findAllCarriers(): Promise<IUser[]> {
    return User.find({ role: 'Carrier' }).select('-passwordHash');
  }

  async findCarrierById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, role: 'Carrier' }).select('-passwordHash');
  }

  async recordDelivery(carrierId: string, onTime: boolean, actualHours: number): Promise<IUser | null> {
    const doc = await User.findByIdAndUpdate(
      carrierId,
      {
        $inc: {
          'carrierProfile.completedShipments': 1,
          'carrierProfile.onTimeDeliveries': onTime ? 1 : 0,
        },
      },
      { new: true },
    );

    if (!doc || !doc.carrierProfile) return doc;

    const n = doc.carrierProfile.completedShipments;
    const newAvg = Math.round(((doc.carrierProfile.avgEtaHours * (n - 1) + actualHours) / n) * 10) / 10;
    const onTimeRate = doc.carrierProfile.onTimeDeliveries / n;
    const rating = Math.round(onTimeRate * 5 * 10) / 10;
    const trustScore = computeTrustScore({ rating, onTimeRate, completedCount: n });

    return User.findByIdAndUpdate(
      carrierId,
      {
        $set: {
          'carrierProfile.avgEtaHours': newAvg,
          'carrierProfile.rating': rating,
          'carrierProfile.trustScore': trustScore,
        },
      },
      { new: true },
    );
  }

  async updateLoginAttempts(
    userId: string,
    update: { failedLoginAttempts: number; lockUntil?: Date },
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, { $set: update });
  }
}

export const userRepository = new UserRepository();
