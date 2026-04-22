import { carrierProfileSchema, shipperProfileSchema } from '../../routes/user.routes';

/**
 * Unit tests for Zod validators — carrierProfileSchema and shipperProfileSchema.
 */

describe('carrierProfileSchema', () => {
  const validPayload = {
    truckType: 'flatbed' as const,
    capacityKg: 10000,
    homeCity: 'Istanbul',
  };

  it('should accept a valid payload with only required fields', () => {
    const result = carrierProfileSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should accept a payload with all new optional fields', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      profilePhotoUrl: 'https://example.com/photo.jpg',
      avgEtaHours: 12,
      trustScore: 80,
      bio: 'Experienced driver',
    });
    expect(result.success).toBe(true);
  });

  it('should accept null for profilePhotoUrl', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      profilePhotoUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it('should accept null for bio', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      bio: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid profilePhotoUrl', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      profilePhotoUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('should reject trustScore > 100', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      trustScore: 150,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative avgEtaHours', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      avgEtaHours: -5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject bio over 500 chars', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      bio: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing truckType', () => {
    const { truckType, ...rest } = validPayload;
    const result = carrierProfileSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject invalid truckType', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      truckType: 'monster-truck',
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative capacityKg', () => {
    const result = carrierProfileSchema.safeParse({
      ...validPayload,
      capacityKg: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe('shipperProfileSchema', () => {
  it('should accept an empty object (all fields optional)', () => {
    const result = shipperProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept a full valid payload', () => {
    const result = shipperProfileSchema.safeParse({
      companyName: 'Acme Logistics',
      profilePhotoUrl: 'https://example.com/logo.png',
      bio: 'We ship fast',
      completedLoads: 42,
      avgTimeToAcceptHours: 2.5,
    });
    expect(result.success).toBe(true);
  });

  it('should accept null values for nullable fields', () => {
    const result = shipperProfileSchema.safeParse({
      companyName: null,
      profilePhotoUrl: null,
      bio: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid profilePhotoUrl', () => {
    const result = shipperProfileSchema.safeParse({
      profilePhotoUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('should reject companyName over 200 chars', () => {
    const result = shipperProfileSchema.safeParse({
      companyName: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('should reject bio over 500 chars', () => {
    const result = shipperProfileSchema.safeParse({
      bio: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative completedLoads', () => {
    const result = shipperProfileSchema.safeParse({
      completedLoads: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer completedLoads', () => {
    const result = shipperProfileSchema.safeParse({
      completedLoads: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative avgTimeToAcceptHours', () => {
    const result = shipperProfileSchema.safeParse({
      avgTimeToAcceptHours: -1,
    });
    expect(result.success).toBe(false);
  });
});
