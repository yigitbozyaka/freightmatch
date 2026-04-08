import api from "./axios-config";

export async function updateCarrierProfile(data: {
  truckType: string;
  capacityKg: number;
  homeCity: string;
}) {
  const response = await api.patch("/api/users/carrier-profile", data);
  return response.data;
}

export async function getUserProfile() {
  const response = await api.get("/api/users/profile");
  return response.data;
}
