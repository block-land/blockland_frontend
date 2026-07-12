import { create } from "zustand";

interface OnboardingState {
  isOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isOpen: false,
  openOnboarding: () => set({ isOpen: true }),
  closeOnboarding: () => set({ isOpen: false }),
}));
