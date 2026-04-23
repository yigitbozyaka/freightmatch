import mongoose from 'mongoose';
import { User, IUser } from '../../models/user.model';

/**
 * Unit tests for User model — verifying schema defaults, validation,
 * and the new carrier/shipper profile sub-documents.
 */


describe('User Model', () => {
  describe('ICarrierProfile fields', () => {
    it('should set carrier profile defaults for new optional fields', () => {
      const user = new User({
        email: 'carrier@test.com',
        passwordHash: 'hashed',
        role: 'Carrier',
        carrierProfile: {
          truckType: 'flatbed',
          capacityKg: 10000,
          homeCity: 'Istanbul',
        },
      });

      expect(user.carrierProfile).toBeDefined();
      expect(user.carrierProfile!.truckType).toBe('flatbed');
      expect(user.carrierProfile!.capacityKg).toBe(10000);
      expect(user.carrierProfile!.homeCity).toBe('Istanbul');
      expect(user.carrierProfile!.rating).toBe(0);
      expect(user.carrierProfile!.completedShipments).toBe(0);
      // New fields
      expect(user.carrierProfile!.profilePhotoUrl).toBeNull();
      expect(user.carrierProfile!.avgEtaHours).toBe(0);
      expect(user.carrierProfile!.trustScore).toBe(0);
      expect(user.carrierProfile!.bio).toBeNull();
    });

    it('should accept explicit values for new carrier profile fields', () => {
      const user = new User({
        email: 'carrier2@test.com',
        passwordHash: 'hashed',
        role: 'Carrier',
        carrierProfile: {
          truckType: 'refrigerated',
          capacityKg: 20000,
          homeCity: 'Ankara',
          profilePhotoUrl: 'https://example.com/photo.jpg',
          avgEtaHours: 12.5,
          trustScore: 85,
          bio: 'Experienced driver',
        },
      });

      expect(user.carrierProfile!.profilePhotoUrl).toBe('https://example.com/photo.jpg');
      expect(user.carrierProfile!.avgEtaHours).toBe(12.5);
      expect(user.carrierProfile!.trustScore).toBe(85);
      expect(user.carrierProfile!.bio).toBe('Experienced driver');
    });

    it('should not have carrierProfile when not provided', () => {
      const user = new User({
        email: 'nocarrier@test.com',
        passwordHash: 'hashed',
        role: 'Carrier',
      });

      expect(user.carrierProfile).toBeUndefined();
    });
  });

  describe('IShipperProfile fields', () => {
    it('should set shipper profile defaults', () => {
      const user = new User({
        email: 'shipper@test.com',
        passwordHash: 'hashed',
        role: 'Shipper',
        shipperProfile: {},
      });

      expect(user.shipperProfile).toBeDefined();
      expect(user.shipperProfile!.companyName).toBeNull();
      expect(user.shipperProfile!.profilePhotoUrl).toBeNull();
      expect(user.shipperProfile!.bio).toBeNull();
      expect(user.shipperProfile!.completedLoads).toBe(0);
      expect(user.shipperProfile!.avgTimeToAcceptHours).toBe(0);
    });

    it('should accept explicit values for shipper profile fields', () => {
      const user = new User({
        email: 'shipper2@test.com',
        passwordHash: 'hashed',
        role: 'Shipper',
        shipperProfile: {
          companyName: 'Acme Logistics',
          profilePhotoUrl: 'https://example.com/logo.png',
          bio: 'We ship fast',
          completedLoads: 42,
          avgTimeToAcceptHours: 2.3,
        },
      });

      expect(user.shipperProfile!.companyName).toBe('Acme Logistics');
      expect(user.shipperProfile!.profilePhotoUrl).toBe('https://example.com/logo.png');
      expect(user.shipperProfile!.bio).toBe('We ship fast');
      expect(user.shipperProfile!.completedLoads).toBe(42);
      expect(user.shipperProfile!.avgTimeToAcceptHours).toBe(2.3);
    });

    it('should not have shipperProfile when not provided', () => {
      const user = new User({
        email: 'noshipper@test.com',
        passwordHash: 'hashed',
        role: 'Shipper',
      });

      expect(user.shipperProfile).toBeUndefined();
    });
  });

  describe('User schema basics', () => {
    it('should require email, passwordHash, and role', async () => {
      const user = new User({});
      const err = user.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors['email']).toBeDefined();
      expect(err!.errors['passwordHash']).toBeDefined();
      expect(err!.errors['role']).toBeDefined();
    });

    it('should reject invalid roles', async () => {
      const user = new User({
        email: 'bad@test.com',
        passwordHash: 'hashed',
        role: 'Admin',
      });
      const err = user.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors['role']).toBeDefined();
    });
  });
});
