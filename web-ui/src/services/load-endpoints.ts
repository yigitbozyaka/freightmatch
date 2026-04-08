import api from "./axios-config";

export async function getMyLoads() {
  const response = await api.get("/api/loads/my-loads");
  return response.data;
}

export async function getAvailableLoads(filters?: {
  origin?: string;
  destination?: string;
  cargoType?: string;
}) {
  const response = await api.get("/api/loads/available", { params: filters });
  return response.data;
}

export async function getLoadById(id: string) {
  const response = await api.get(`/api/loads/${id}`);
  return response.data;
}

export async function createLoad(data: {
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
}) {
  const response = await api.post("/api/loads", data);
  return response.data;
}

export async function updateLoadStatus(id: string, status: string) {
  const response = await api.patch(`/api/loads/${id}/status`, { status });
  return response.data;
}

export async function deleteLoad(id: string) {
  const response = await api.delete(`/api/loads/${id}`);
  return response.data;
}
