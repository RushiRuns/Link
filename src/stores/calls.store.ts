import { create } from 'zustand';

export interface ActiveCallInfo {
  callId: string;
  peerId: string;
  peerName?: string;
  mediaType: 'voice' | 'video';
  status: 'ringing' | 'connected' | 'declined' | 'ended';
  isIncoming: boolean;
  sdpOffer?: string;
}

interface CallsState {
  activeCall: ActiveCallInfo | null;
  incomingCall: ActiveCallInfo | null;
  setIncomingCall: (call: ActiveCallInfo | null) => void;
  setActiveCall: (call: ActiveCallInfo | null) => void;
  updateCallStatus: (status: ActiveCallInfo['status']) => void;
  endCall: () => Promise<void>;
  initListeners: () => () => void;
}

export const useCallsStore = create<CallsState>((set, get) => ({
  activeCall: null,
  incomingCall: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),

  updateCallStatus: (status) => {
    set((state) => {
      if (state.activeCall) {
        return { activeCall: { ...state.activeCall, status } };
      }
      return state;
    });
  },

  endCall: async () => {
    const current = get().activeCall || get().incomingCall;
    if (current && window.link?.calls) {
      try {
        await window.link.calls.endCall(current.callId);
      } catch (err) {
        console.error('[CallsStore] Error ending call:', err);
      }
    }
    set({ activeCall: null, incomingCall: null });
  },

  initListeners: () => {
    if (!window.link?.calls) return () => {};

    const cleanOffer = window.link.calls.onOfferReceived((call) => {
      const incoming: ActiveCallInfo = {
        callId: call.id,
        peerId: call.initiatorId,
        mediaType: call.mediaType,
        status: 'ringing',
        isIncoming: true,
        sdpOffer: call.sdp
      };
      set({ incomingCall: incoming });
      window.electron?.flashFrame(true);
    });

    const cleanAnswer = window.link.calls.onAnswerReceived(({ accepted }) => {
      if (accepted) {
        get().updateCallStatus('connected');
      } else {
        get().updateCallStatus('declined');
        setTimeout(() => set({ activeCall: null }), 2000);
      }
    });

    const cleanEnded = window.link.calls.onCallEnded(() => {
      set({ activeCall: null, incomingCall: null });
    });

    return () => {
      cleanOffer();
      cleanAnswer();
      cleanEnded();
    };
  }
}));
