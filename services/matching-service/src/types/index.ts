export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AppError extends Error {
  statusCode?: number;
  errorCode?: string;
}

export interface CarrierProfile {
  truckType: string;
  capacityKg: number;
  homeCity: string;
  rating: number;
  completedShipments: number;
}

export interface CarrierResponse {
  id: string;
  email: string;
  role: string;
  carrierProfile: CarrierProfile | null;
  createdAt: string;
}

export interface LoadCreatedEvent {
  eventType: string;
  loadId: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
  shipperId: string;
  timestamp: string;
}

export interface CarrierRecommendation {
  carrierId: string;
  score: number;
  reason: string;
}
