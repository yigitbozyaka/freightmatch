import { z } from "zod";
import { ApiResponseError, apiFetch } from "./client";

const UserSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  email: z.string().email(),
  role: z.enum(["Shipper", "Carrier"]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const TruckTypeSchema = z.enum(["flatbed", "refrigerated", "dry-van", "tanker"]);

const CarrierProfileSchema = z.object({
  truckType: TruckTypeSchema.optional(),
  capacityKg: z.number().optional(),
  homeCity: z.string().optional(),
  rating: z.number().optional(),
  completedShipments: z.number().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
  avgEtaHours: z.number().optional(),
  trustScore: z.number().optional(),
  bio: z.string().nullable().optional(),
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

const ShipperProfileSchema = z.object({
  companyName: z.string().nullable().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  completedLoads: z.number().optional(),
  avgTimeToAcceptHours: z.number().optional(),
});

const ProfileResponseSchema = UserSchema.extend({
  carrierProfile: CarrierProfileSchema.nullable().optional(),
  shipperProfile: ShipperProfileSchema.nullable().optional(),
});

const CarrierProfileResponseSchema = UserSchema.extend({
  carrierProfile: CarrierProfileSchema.nullable(),
});

const ProfilePhotoUploadResponseSchema = z.object({
  profilePhotoUrl: z.string(),
});

const ShipperProfileResponseSchema = UserSchema.extend({
  shipperProfile: ShipperProfileSchema.nullable(),
});

export type User = z.infer<typeof UserSchema>;
export type CarrierProfile = z.infer<typeof CarrierProfileSchema>;
export type ShipperProfile = z.infer<typeof ShipperProfileSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type ProfilePhotoUploadResponse = z.infer<typeof ProfilePhotoUploadResponseSchema>;

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
  truckType?: z.infer<typeof TruckTypeSchema>;
  capacityKg?: number;
  homeCity?: string;
  profilePhotoUrl?: string | null;
  bio?: string | null;
};

export type UpdateShipperProfileInput = {
  companyName?: string | null;
  profilePhotoUrl?: string | null;
  bio?: string | null;
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

export async function getUserById(id: string): Promise<ProfileResponse> {
  const data = await apiFetch<unknown>(`api/users/${id}`);
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

export function uploadProfilePhoto(
  photo: Blob,
  onProgress?: (progress: number) => void,
): Promise<ProfilePhotoUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/proxy/api/users/profile/photo");
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const text = xhr.responseText;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(ProfilePhotoUploadResponseSchema.parse(JSON.parse(text)));
        } catch {
          reject(new Error("Photo uploaded, but the response was not valid."));
        }
        return;
      }

      let message = text || "Photo upload failed.";
      try {
        const json = JSON.parse(text) as { error?: string; message?: string };
        message = json.message ?? json.error ?? message;
      } catch {
        // use raw text
      }
      reject(new ApiResponseError(xhr.status, message));
    };

    xhr.onerror = () => reject(new Error("Network error while uploading photo."));
    xhr.onabort = () => reject(new Error("Photo upload was cancelled."));

    const formData = new FormData();
    formData.append("photo", photo, "profile-photo.webp");
    xhr.send(formData);
  });
}

export async function updateShipperProfile(
  input: UpdateShipperProfileInput,
): Promise<z.infer<typeof ShipperProfileResponseSchema>> {
  const data = await apiFetch<unknown>("api/users/shipper-profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return ShipperProfileResponseSchema.parse(data);
}
