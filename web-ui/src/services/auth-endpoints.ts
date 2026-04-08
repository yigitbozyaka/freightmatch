import { User } from "../models/User";
import api from "./axios-config";

export async function login(email: string, password: string): Promise<boolean> {
  const response = await api.post("/api/users/login", { email, password });
  
  if (response.data && response.data.accessToken) {
    // Save tokens in localStorage upon successful login
    localStorage.setItem("accessToken", response.data.accessToken);
    localStorage.setItem("refreshToken", response.data.refreshToken);
    return true;
  }
  return false;
}

export async function register(email: string, password: string, role: string): Promise<boolean> {
  const response = await api.post("/api/users/register", { email, password, role });
  if (response.status === 201) return true;
  return false;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api.get("/api/users/profile");
    if (response.data) {
      return new User(response.data);
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  // Optionally call an API logout endpoint if your backend supports a token blacklist later
}
