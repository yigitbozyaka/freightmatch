import api from "./axios-config";

export async function getMyBids() {
  const response = await api.get("/api/bids/my");
  return response.data;
}

export async function getBidsByLoad(loadId: string) {
  const response = await api.get(`/api/bids/${loadId}`);
  return response.data;
}

export async function createBid(data: {
  loadId: string;
  priceUSD: number;
  estimatedDeliveryHours: number;
}) {
  const response = await api.post("/api/bids", data);
  return response.data;
}

export async function acceptBid(bidId: string) {
  const response = await api.patch(`/api/bids/${bidId}/accept`);
  return response.data;
}
