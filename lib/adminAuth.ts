import { BACKEND_URL } from "@/lib/api";

export async function getAdminSession() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data; // returns { user, session }
  } catch (err) {
    console.error("getAdminSession error:", err);
    return null;
  }
}

export async function loginAdmin(email: string, password: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error("loginAdmin error:", err);
    return { ok: false, data: { error: { message: "Network error" } } };
  }
}

export async function logoutAdmin() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false };
  } catch (err) {
    console.error("logoutAdmin error:", err);
    return { ok: false };
  }
}
