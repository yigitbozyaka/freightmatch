import api from "./axios-config";

export async function getRecommendations(loadId: string) {
  const response = await api.get(`/api/match/${loadId}`);
  return response.data;
}
