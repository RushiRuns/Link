import { create } from 'zustand';

export type ActiveView = 'chat' | 'calls' | 'settings';

interface AppState {
  activeView: ActiveView;
  selectedPeerId: string | null;
  selectedGroupId: string | null;
  activeCallId: string | null;
  isDarkMode: boolean;

  setActiveView: (view: ActiveView) => void;
  selectPeer: (peerId: string | null) => void;
  selectGroup: (groupId: string | null) => void;
  setActiveCall: (callId: string | null) => void;
  setDarkMode: (isDark: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'chat',
  selectedPeerId: null,
  selectedGroupId: null,
  activeCallId: null,
  isDarkMode: true,

  setActiveView: (view) => set({ activeView: view }),
  selectPeer: (peerId) => set({ selectedPeerId: peerId, selectedGroupId: null }),
  selectGroup: (groupId) => set({ selectedGroupId: groupId, selectedPeerId: null }),
  setActiveCall: (callId) => set({ activeCallId: callId }),
  setDarkMode: (isDark) => set({ isDarkMode: isDark })
}));
