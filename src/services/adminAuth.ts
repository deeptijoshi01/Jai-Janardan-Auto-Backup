import { API_BASE_URL } from "../config/api";

export const AUTH_API_BASE_URL = API_BASE_URL;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | string;
  profileImage: string;
}

interface AuthResponse {
  success?: boolean;
  message?: string;
  user?: AdminUser;
}

async function readResponse(response: Response): Promise<AuthResponse> {
  return (await response.json().catch(() => null)) as AuthResponse;
}

export async function loginAdmin(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<AdminUser> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });
  const data = await readResponse(response);
  if (!response.ok || !data.success || !data.user) {
    throw new Error(data.message || "Unable to sign in.");
  }
  return data.user;
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminRemember");
  } catch (error) {
    console.error("Unable to clear legacy admin browser storage:", error);
  }
}

export async function verifyAdminSession(): Promise<AdminUser | null> {
  clearAdminSession();
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });
  const data = await readResponse(response);
  if (response.status === 401) return null;
  if (!response.ok || !data.success || !data.user) {
    throw new Error(data.message || "Unable to verify the admin session.");
  }
  return data.user;
}

export async function logoutAdmin(): Promise<void> {
  const response = await fetch(`${AUTH_API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  const data = await readResponse(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to sign out.");
  }
  clearAdminSession();
}

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
  });
  if (response.status === 401) {
    clearAdminSession();
    window.location.assign("/admin/login");
  }
  return response;
}
