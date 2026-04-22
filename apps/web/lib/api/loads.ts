import { z } from "zod";
import { apiFetch } from "./client";

const LoadStatusSchema = z.enum(["Draft", "Posted", "Matched", "InTransit", "Delivered"]);

const LoadSchema = z.object({
  _id: z.string(),
  shipperId: z.string().optional(),
  title: z.string(),
  origin: z.string(),
  destination: z.string(),
  cargoType: z.string(),
  weightKg: z.number(),
  deadlineHours: z.number(),
  status: LoadStatusSchema,
  statusHistory: z
    .array(
      z.object({
        from: z.string().nullable(),
        to: z.string(),
      })
    )
    .optional(),
});

export type Load = z.infer<typeof LoadSchema>;
export type LoadStatus = z.infer<typeof LoadStatusSchema>;

export type CreateLoadInput = {
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
};

export type UpdateLoadInput = Partial<Omit<CreateLoadInput, "origin" | "destination">> & {
  origin?: string;
  destination?: string;
};

export type ListAvailableParams = {
  origin?: string;
  destination?: string;
  cargoType?: string;
};

export async function createLoad(input: CreateLoadInput): Promise<Load> {
  const data = await apiFetch<unknown>("api/loads", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return LoadSchema.parse(data);
}

export async function list(): Promise<Load[]> {
  const data = await apiFetch<unknown>("api/loads/my-loads");
  return z.array(LoadSchema).parse(data);
}

export async function listAvailable(params?: ListAvailableParams): Promise<Load[]> {
  const query = new URLSearchParams();
  if (params?.origin) query.set("origin", params.origin);
  if (params?.destination) query.set("destination", params.destination);
  if (params?.cargoType) query.set("cargoType", params.cargoType);
  const qs = query.size > 0 ? `?${query.toString()}` : "";
  const data = await apiFetch<unknown>(`api/loads/available${qs}`);
  return z.array(LoadSchema).parse(data);
}

export async function get(id: string): Promise<Load> {
  const data = await apiFetch<unknown>(`api/loads/${id}`);
  return LoadSchema.parse(data);
}

export async function updateStatus(id: string, status: LoadStatus): Promise<Load> {
  const data = await apiFetch<unknown>(`api/loads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return LoadSchema.parse(data);
}

export async function update(id: string, input: UpdateLoadInput): Promise<Load> {
  const data = await apiFetch<unknown>(`api/loads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return LoadSchema.parse(data);
}
