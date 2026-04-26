import { z } from "zod";
import { apiFetch } from "./client";

const BidStatusSchema = z.enum(["Pending", "Accepted", "Rejected"]);

const BidLoadSnapshotSchema = z
  .object({
    _id: z.string().optional(),
    title: z.string().optional(),
    origin: z.string().optional(),
    destination: z.string().optional(),
  })
  .optional();

const BidSchema = z.object({
  _id: z.string(),
  loadId: z.string(),
  carrierId: z.string().optional(),
  priceUSD: z.number(),
  estimatedDeliveryHours: z.number(),
  status: BidStatusSchema,
  submittedAt: z.string().optional(),
  createdAt: z.string().optional(),
  load: BidLoadSnapshotSchema,
});

export type Bid = z.infer<typeof BidSchema>;
export type BidStatus = z.infer<typeof BidStatusSchema>;

export type CreateBidInput = {
  loadId: string;
  priceUSD: number;
  estimatedDeliveryHours: number;
};

export async function create(input: CreateBidInput): Promise<Bid> {
  const data = await apiFetch<unknown>("api/bids", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return BidSchema.parse(data);
}

export async function listMine(): Promise<Bid[]> {
  const data = await apiFetch<unknown>("api/bids/my");
  return z.array(BidSchema).parse(data);
}

export async function listForLoad(loadId: string): Promise<Bid[]> {
  const data = await apiFetch<unknown>(`api/bids/${loadId}`);
  return z.array(BidSchema).parse(data);
}

export async function accept(bidId: string): Promise<Bid> {
  const data = await apiFetch<unknown>(`api/bids/${bidId}/accept`, {
    method: "PATCH",
  });
  return BidSchema.parse(data);
}
