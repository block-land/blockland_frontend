import { create } from "zustand";
import { BACKEND_URL } from "@/lib/api";

interface ClientProfile {
  id: string;
  walletAddress: string;
  username: string;
  photoUrl: string | null;
}

interface ProfileState {
  showProfileDialog: boolean;
  isLoadingProfile: boolean;
  profileData: ClientProfile | null;
  checkProfile: (walletAddress: string) => Promise<boolean>;
  submitProfile: (walletAddress: string, username: string, photoUrl: string) => Promise<boolean>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  showProfileDialog: false,
  isLoadingProfile: false,
  profileData: null,
  checkProfile: async (walletAddress) => {
    set({ isLoadingProfile: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/client/${walletAddress}`);
      const data = await res.json();
      if (data.ok && data.client) {
        set({ profileData: data.client, showProfileDialog: false });
        return true;
      } else {
        set({ profileData: null, showProfileDialog: true });
        return false;
      }
    } catch (err) {
      console.error("checkProfile error:", err);
      // Backend error or not registered yet, trigger setup dialog
      set({ profileData: null, showProfileDialog: true });
      return false;
    } finally {
      set({ isLoadingProfile: false });
    }
  },
  submitProfile: async (walletAddress, username, photoUrl) => {
    set({ isLoadingProfile: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, username, photoUrl }),
      });
      const data = await res.json();
      if (data.ok && data.client) {
        set({ profileData: data.client, showProfileDialog: false });
        return true;
      }
      return false;
    } catch (err) {
      console.error("submitProfile error:", err);
      return false;
    } finally {
      set({ isLoadingProfile: false });
    }
  },
}));
