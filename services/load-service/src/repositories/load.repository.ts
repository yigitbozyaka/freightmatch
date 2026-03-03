import mongoose from 'mongoose';
import { Load, ILoad } from '../models/load.model';

export class LoadRepository {
  async findById(id: string): Promise<ILoad | null> {
    return Load.findById(id);
  }

  async create(data: {
    shipperId: string;
    title: string;
    origin: string;
    destination: string;
    cargoType: string;
    weightKg: number;
    deadlineHours: number;
    status?: string;
  }): Promise<ILoad> {
    return Load.create(data);
  }

  async update(id: string, data: Partial<ILoad>): Promise<ILoad | null> {
    return Load.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<ILoad | null> {
    return Load.findByIdAndDelete(id);
  }

  async findByShipperId(shipperId: string): Promise<ILoad[]> {
    return Load.find({ shipperId }).sort({ createdAt: -1 });
  }

  async findAvailable(filters?: { origin?: string; destination?: string; cargoType?: string }): Promise<ILoad[]> {
    const query: mongoose.FilterQuery<ILoad> = { status: 'Posted' };
    
    if (filters?.origin) {
      query.origin = new RegExp(filters.origin, 'i');
    }
    
    if (filters?.destination) {
      query.destination = new RegExp(filters.destination, 'i');
    }
    
    if (filters?.cargoType) {
      query.cargoType = filters.cargoType;
    }
    
    return Load.find(query).sort({ createdAt: -1 });
  }
}

export const loadRepository = new LoadRepository();
