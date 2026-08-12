import { create } from 'zustand';
import { playNotificationSound } from '../utils/audio';

export interface ActiveCallInfo {
  callId: string;
  peerId: string;
  peerName?: string;
  mediaType: 'voice' | 'video';
  status: 'ringing' | 'connecting' | 'connected' | 'declined' | 'ended' | 'no_answer';
  isIncoming: boolean;
  sdpOffer?: string;
}

interface CallsState {
  activeCall: ActiveCallInfo | null;
  incomingCall: ActiveCallInfo | null;
  setIncomingCall: (call: ActiveCallInfo | null) => void;
  setActiveCall: (call: ActiveCallInfo | null) => void;
  updateCallStatus: (status: ActiveCallInfo['status']) => void;
  endCall: (reason?: string) => Promise<void>;
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

  endCall: async (reason?: string) => {
    const current = get().activeCall || get().incomingCall;
    if (current && window.link?.calls) {
      try {
        await window.link.calls.endCall(current.callId, reason);
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
        peerName: (call as any).peerName,
        mediaType: call.mediaType,
        status: 'ringing',
        isIncoming: true,
        sdpOffer: call.sdp
      };
      set({ incomingCall: incoming });
      window.electron?.flashFrame(true);
      playNotificationSound();
    });

    const cleanAnswer = window.link.calls.onAnswerReceived(({ accepted }) => {
      if (accepted) {
        get().updateCallStatus('connected');
      } else {
        get().updateCallStatus('declined');
        setTimeout(() => set({ activeCall: null }), 2000);
      }
    });

    const cleanEnded = window.link.calls.onCallEnded((data: any) => {
      const reason = typeof data === 'string' ? undefined : data?.reason;
      if (reason === 'declined' || reason === 'no_answer') {
        get().updateCallStatus(reason);
        setTimeout(() => set({ activeCall: null, incomingCall: null }), 2000);
      } else {
        set({ activeCall: null, incomingCall: null });
      }
    });

    return () => {
      cleanOffer();
      cleanAnswer();
      cleanEnded();
    };
  }
}));
