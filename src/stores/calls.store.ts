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
  connectedAt?: number;
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
  setActiveCall: (call) => {
    set({ activeCall: call });
    if (call && !call.isIncoming && !window.link?.calls) {
      setTimeout(() => {
        get().setMediaError('Calls require Electron IPC (Preview Mode)');
        get().endCall('failed');
      }, 500);
    }
  },

  updateCallStatus: (status) => {
    set((state) => {
      if (state.activeCall) {
        const update: Partial<ActiveCallInfo> = { status };
        if (status === 'connected' && state.activeCall.status !== 'connected') {
          update.connectedAt = Date.now();
        }
        return { activeCall: { ...state.activeCall, ...update } };
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
    
    const logCall = (call: ActiveCallInfo, endReason: string) => {
      const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        if (m >= 60) {
          const h = Math.floor(m / 60);
          const rm = m % 60;
          return `${h.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      };
      
      let msgContent = `${call.mediaType === 'video' ? 'Video' : 'Voice'} call ended`;
      if (endReason === 'declined') msgContent = call.isIncoming ? 'You declined the call' : 'Peer declined the call';
      if (endReason === 'no_answer') msgContent = 'Missed call';
      if (endReason === 'busy') msgContent = 'User busy';
      
      if (call.connectedAt && (endReason === 'ended' || !endReason)) {
        const durationSecs = Math.floor((Date.now() - call.connectedAt) / 1000);
        msgContent += ` • ${formatTime(durationSecs)}`;
      }
      
      // Dynamic import to avoid circular dependency
      import('./conversations.store').then(({ useConversationsStore }) => {
        useConversationsStore.getState().addMessage({
          id: 'sys_' + Math.random().toString(36).substring(7),
          conversationId: call.peerId,
          senderId: 'system',
          senderName: 'System',
          content: msgContent,
          timestamp: Date.now(),
          deliveryStatus: 'delivered'
        });
      });
    };

    if (activeCall) {
      callsToEnd.set(activeCall.callId, activeCall);
      logCall(activeCall, reason || 'ended');
    }
    if (incomingCall) {
      callsToEnd.set(incomingCall.callId, incomingCall);
      if (!activeCall) logCall(incomingCall, reason || 'no_answer');
    }

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
    if (!window.link?.calls) {
      console.warn('[CallsStore] window.link.calls is missing. Calls will not function in browser preview mode.');
      return () => {};
    }

    const cleanOffer = window.link.calls.onOfferReceived((call) => {
      if (get().activeCall || get().incomingCall) {
        console.warn(`[CallsStore] Call collision detected: automatically rejecting offer ${call.id} as 'busy'.`);
        window.link.calls.endCall(call.id, 'busy');
        return;
      }

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
