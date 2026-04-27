import { create } from 'zustand';

interface UiState {
  isTabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

export const useUiStore = create<UiState>(set => ({
  isTabBarVisible: true,
  setTabBarVisible: visible => set({ isTabBarVisible: visible }),
}));
