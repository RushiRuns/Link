import { create } from 'zustand';
import { playNotificationSound, stopNotificationSound } from '../utils/audio';

export interface ActiveCallInfo {
  callId: string;
  peerId: string;
  peerName?: string;
  mediaType: 'voice' | 'video';
  status: 'ringing' | 'connecting' | 'connected' | 'declined' | 'ended' | 'no_answer' | 'busy';
  isIncoming: boolean;
  sdpOffer?: string;
  isRemoteAudioMuted?: boolean;
  isRemoteVideoMuted?: boolean;
}

interface CallsState {
  activeCall: ActiveCallInfo | null;
  incomingCall: ActiveCallInfo | null;
  mediaError: string | null;
  setMediaError: (error: string | null) => void;
  setIncomingCall: (call: ActiveCallInfo | null) => void;
  setActiveCall: (call: ActiveCallInfo | null) => void;
  updateCallStatus: (status: ActiveCallInfo['status']) => void;
  updateRemoteMuteStatus: (audioMuted: boolean, videoMuted: boolean) => void;
  endCall: (reason?: string) => Promise<void>;
  initListeners: () => () => void;
}

export const useCallsStore = create<CallsState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  mediaError: null,

  setMediaError: (error) => set({ mediaError: error }),
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

  updateRemoteMuteStatus: (audioMuted, videoMuted) => {
    set((state) => {
      if (state.activeCall) {
        return { activeCall: { ...state.activeCall, isRemoteAudioMuted: audioMuted, isRemoteVideoMuted: videoMuted } };
      }
      return state;
    });
  },

  endCall: async (reason?: string) => {
    const { activeCall, incomingCall } = get();
    const callsToEnd = new Map<string, any>();
    if (activeCall) callsToEnd.set(activeCall.callId, activeCall);
    if (incomingCall) callsToEnd.set(incomingCall.callId, incomingCall);

    stopNotificationSound();
    set({ activeCall: null, incomingCall: null });

    if (window.link?.calls) {
      for (const call of callsToEnd.values()) {
        try {
          await window.link.calls.endCall(call.callId, reason);
        } catch (err) {
          console.error('[CallsStore] Error ending call:', err);
        }
      }
    }
  },

  initListeners: () => {
    if (!window.link?.calls) return () => {};

    const cleanOffer = window.link.calls.onOfferReceived((call) => {
      const incoming: ActiveCallInfo = {
        callId: call.id,
        peerId: call.initiatorId,
        peerName: call.peerName,
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
      stopNotificationSound();
      if (accepted) {
        get().updateCallStatus('connecting');
      } else {
        get().updateCallStatus('declined');
        const currentCallId = get().activeCall?.callId;
        setTimeout(() => {
          set((state) => (state.activeCall?.callId === currentCallId ? { activeCall: null } : state));
        }, 2000);
      }
    });

    const cleanEnded = window.link.calls.onCallEnded((data: { callId: string; reason?: string }) => {
      stopNotificationSound();
      const reason = data?.reason;
      const callId = data?.callId;
      if (reason === 'declined' || reason === 'no_answer' || reason === 'busy') {
        get().updateCallStatus(reason);
        const currentCallId = get().activeCall?.callId;
        setTimeout(() => {
          set((state) => (state.activeCall?.callId === currentCallId ? { activeCall: null, incomingCall: null } : state));
        }, 2000);
      } else {
        set((state) => (
          state.activeCall?.callId === callId || state.incomingCall?.callId === callId 
            ? { activeCall: null, incomingCall: null } 
            : state
        ));
      }
    });

    const cleanMute = window.link.calls.onMuteReceived(({ callId, audioMuted, videoMuted }) => {
      if (get().activeCall?.callId === callId) {
        get().updateRemoteMuteStatus(audioMuted, videoMuted);
      }
    });

    return () => {
      cleanOffer();
      cleanAnswer();
      cleanEnded();
      cleanMute();
    };
  }
}));
