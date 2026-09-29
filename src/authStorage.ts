import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Shared authentication/session storage helper.
 *
 * Both Super Admin and Sub Admin log in through the SAME API
 * (http://macsof.in/milkmanagement/api/login). The API does not
 * expose separate endpoints, so role is determined client-side
 * from `role_id` in the login response.
 *
 * ASSUMPTION (confirm / adjust if wrong):
 *   role_id === "1"  -> Super Admin
 *   anything else    -> Sub Admin
 *
 * If Sub Admin turns out to have its own specific role_id (e.g. "2"),
 * change SUPER_ADMIN_ROLE_ID logic in `resolveRole` below to an
 * explicit equality check instead of "not equal to 1".
 */

export type UserRole = "super_admin" | "sub_admin" | string;

export interface StoredUserData {
  role: UserRole;
  role_id: string;
  admin_id: string;
  admin_name: string;
  email: string;
  mobile_number?: string;
  photo?: string;
  address?: string;
  status?: string;
}

const AUTH_KEY = "@canan_dairy_auth";
export const SUPER_ADMIN_ROLE_ID = "1";
export const SUB_ADMIN_ROLE_ID = "2";

export function resolveRole(role_id: string | number): UserRole {
  const code = String(role_id ?? "").trim();
  return code === SUPER_ADMIN_ROLE_ID ? "super_admin" : "sub_admin";
}

export async function saveUserSession(data: StoredUserData): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

export async function getUserSession(): Promise<StoredUserData | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw ? (JSON.parse(raw) as StoredUserData) : null;
}

export async function clearUserSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export async function requireSubAdminSession(): Promise<StoredUserData | null> {
  const session = await getUserSession();
  if (!session || session.role !== "sub_admin") {
    return null;
  }
  return session;
}

export async function requireSuperAdminSession(): Promise<StoredUserData | null> {
  const session = await getUserSession();
  if (!session || session.role !== "super_admin") {
    return null;
  }
  return session;
}