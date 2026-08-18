import { create } from 'zustand';
import { IncomingRemoteRequest, RemoteAccessSession, PermissionMode } from '../types/remote-access.js';

interface RemoteAccessState {
  incomingRequest: IncomingRemoteRequest | null;
  activeSession: RemoteAccessSession | null;
  
  // Host consent flow state
  pendingPermissionMode: PermissionMode | null;
  showScreenPicker: boolean;

  // Computed state
  isSessionActive: boolean;

  // Actions
  setIncomingRequest: (req: IncomingRemoteRequest | null) => void;
  
  // Host flow
  startScreenSelection: (mode: PermissionMode) => void;
  cancelScreenSelection: () => void;
  denyRequest: () => Promise<void>;
  
  // Session management
  setActiveSession: (session: RemoteAccessSession | null) => void;
  updateSession: (update: Partial<RemoteAccessSession>) => void;
  clearSession: () => void;
  endSession: () => Promise<void>;
  
  initListeners: () => () => void;
}

export const useRemoteAccessStore = create<RemoteAccessState>((set, get) => ({
  incomingRequest: null,
  activeSession: null,
  pendingPermissionMode: null,
  showScreenPicker: false,
  isSessionActive: false,

  setIncomingRequest: (req) => set({ incomingRequest: req }),

  startScreenSelection: (mode) => set({ 
    pendingPermissionMode: mode, 
    showScreenPicker: true 
  }),

  cancelScreenSelection: () => set({ 
    pendingPermissionMode: null, 
    showScreenPicker: false 
  }),

  denyRequest: async () => {
    const { incomingRequest } = get();
    if (incomingRequest && window.link?.remoteAccess) {
      await window.link.remoteAccess.endSession(incomingRequest.sessionId);
    }
    set({ incomingRequest: null });
  },

  setActiveSession: (session) => set({ 
    activeSession: session,
    isSessionActive: session !== null
  }),
  
  updateSession: (update) => set((state) => {
    const next = state.activeSession ? { ...state.activeSession, ...update } : null;
    return {
      activeSession: next,
      isSessionActive: next !== null
    };
  }),

  clearSession: () => set({ 
    activeSession: null,
    isSessionActive: false,
    pendingPermissionMode: null, 
    showScreenPicker: false 
  }),

  endSession: async () => {
    const { activeSession } = get();
    if (activeSession && window.link?.remoteAccess) {
      await window.link.remoteAccess.endSession(activeSession.sessionId);
    }
    get().clearSession();
  },

  initListeners: () => {
    if (!window.link?.remoteAccess) return () => {};

    const cleanups = [
      window.link.remoteAccess.onRequestReceived((data: any) => {
        // Only accept new requests if we aren't already in a session or picking a screen
        if (!get().isSessionActive && !get().incomingRequest && !get().showScreenPicker) {
          set({
            incomingRequest: {
              sessionId: data.sessionId,
              peerId: data.peerId,
              peerName: data.peerName
            }
          });
        } else {
          // Busy, auto-deny
          window.link.remoteAccess.endSession(data.sessionId);
        }
      }),

      window.link.remoteAccess.onSessionAccepted((data: any) => {
        const session = get().activeSession;
        // Controller side receives accept
        if (session && session.sessionId === data.sessionId) {
          get().updateSession({
            sessionToken: data.sessionToken,
            permissionMode: data.permissionMode
          });
        }
      }),

      window.link.remoteAccess.onSessionEnded((data: any) => {
        const session = get().activeSession;
        const incoming = get().incomingRequest;
        if (session && session.sessionId === data.sessionId) {
          get().clearSession();
        } else if (incoming && incoming.sessionId === data.sessionId) {
          set({ incomingRequest: null });
        }
      })
    ];

    return () => cleanups.forEach((c) => c());
  }
}));
