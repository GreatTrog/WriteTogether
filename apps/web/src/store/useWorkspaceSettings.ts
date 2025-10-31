import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkspaceTheme = "standard" | "dyslexia" | "high-contrast" | "dark";

export const themeOptions: Array<{ value: WorkspaceTheme; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "dyslexia", label: "Dyslexia-friendly" },
  { value: "high-contrast", label: "High contrast" },
  { value: "dark", label: "Dark" },
];

type WorkspaceSettingsStore = {
  theme: WorkspaceTheme;
  setTheme: (theme: WorkspaceTheme) => void;
};

const themeStorageKey = "writetogether-workspace-theme";

export const useWorkspaceSettings = create<WorkspaceSettingsStore>()(
  persist(
    (set) => ({
      theme: "standard",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: themeStorageKey,
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);


