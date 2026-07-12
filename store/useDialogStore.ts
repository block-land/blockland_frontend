import { create } from "zustand";
import React from "react";

interface DialogState {
  isOpen: boolean;
  title: string;
  content: React.ReactNode | null;
  openDialog: (title: string, content: React.ReactNode) => void;
  closeDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  isOpen: false,
  title: "",
  content: null,
  openDialog: (title, content) => set({ isOpen: true, title, content }),
  closeDialog: () => set({ isOpen: false, title: "", content: null }),
}));
