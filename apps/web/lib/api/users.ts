import { z } from "zod";
import { apiFetch } from "./client";

const UserSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  email: z.string().email(),
  role: z.enum(["Shipper", "Carrier"]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const CarrierProfileSchema = z.object({
  truckType: z.enum(["flatbed", "refrigerated", "dry-van", "tanker"]),
  capacityKg: z.number(),
  homeCity: z.string(),
  rating: z.number().optional(),
  completedShipments: z.number().optional(),
});

const RegisterResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["Shipper", "Carrier"]),
  createdAt: z.string(),
});

const LoginResponseSchema = z.object({
  user: UserSchema,
});

const ProfileResponseSchema = UserSchema.extend({
  carrierProfile: CarrierProfileSchema.optional(),
});

const CarrierProfileResponseSchema = UserSchema.extend({
  carrierProfile: CarrierProfileSchema,
});

export type User = z.infer<typeof UserSchema>;
export type CarrierProfile = z.infer<typeof CarrierProfileSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;

export type RegisterInput = {
  email: string;
  password: string;
  role: "Shipper" | "Carrier";
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UpdateCarrierProfileInput = {
  truckType?: "flatbed" | "refrigerated" | "dry-van" | "tanker";
  capacityKg?: number;
  homeCity?: string;
};

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const data = await apiFetch<unknown>("api/users/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return RegisterResponseSchema.parse(data);
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const data = await apiFetch<unknown>("api/users/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return LoginResponseSchema.parse(data);
}

export async function logout(): Promise<void> {
  await apiFetch<void>("api/users/logout", { method: "POST" });
}

export async function refresh(): Promise<void> {
  await apiFetch<void>("api/users/refresh", { method: "POST" });
}

export async function getProfile(): Promise<ProfileResponse> {
  const data = await apiFetch<unknown>("api/users/profile");
  return ProfileResponseSchema.parse(data);
}

export async function updateCarrierProfile(
  input: UpdateCarrierProfileInput,
): Promise<z.infer<typeof CarrierProfileResponseSchema>> {
  const data = await apiFetch<unknown>("api/users/carrier-profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return CarrierProfileResponseSchema.parse(data);
}
