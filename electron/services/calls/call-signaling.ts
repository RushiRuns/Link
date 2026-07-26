import { connectionManager } from '../network/connection-manager.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { v4 as uuidv4 } from 'uuid';

export interface ActiveCallState {
  callId: string;
  peerId: string;
  mediaType: 'voice' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'declined' | 'failed';
  sdpOffer?: string;
  sdpAnswer?: string;
}

class CallSignalingService {
  private windowRef: any = null;
  private activeCalls: Map<string, ActiveCallState> = new Map();

  public init(mainWindow: any) {
    this.windowRef = mainWindow;

    connectionManager.on('message', (senderDeviceId: string, envelope: any) => {
      switch (envelope.type) {
        case 'call.offer':
          this.handleCallOffer(senderDeviceId, envelope);
          break;
        case 'call.answer':
          this.handleCallAnswer(senderDeviceId, envelope);
          break;
        case 'call.ice':
          this.handleIceCandidate(senderDeviceId, envelope);
          break;
        case 'call.end':
          this.handleCallEnd(senderDeviceId, envelope);
          break;
      }
    });

    connectionManager.on('peer:disconnected', (peerId: string) => {
      for (const [callId, state] of this.activeCalls.entries()) {
        if (state.peerId === peerId) {
          this.activeCalls.delete(callId);
          this.windowRef?.webContents?.send('calls:ended', callId);
        }
      }
    });
  }

  public setWindow(mainWindow: any) {
    this.windowRef = mainWindow;
  }

  public async sendOffer(peerId: string, mediaType: 'voice' | 'video', sdp: string) {
    const callId = uuidv4();
    const state: ActiveCallState = {
      callId,
      peerId,
      mediaType,
      status: 'ringing',
      sdpOffer: sdp
    };

    this.activeCalls.set(callId, state);

    connectionManager.send(peerId, {
      type: 'call.offer',
      id: 'offer_' + uuidv4(),
      ts: Date.now(),
      payload: {
        callId,
        mediaType,
        sdp
      }
    });

    return {
      id: callId,
      initiatorId: getOrGenerateIdentity().deviceId,
      peerId,
      mediaType,
      status: 'ringing' as const,
      startedAt: Date.now()
    };
  }

  public async sendAnswer(callId: string, accepted: boolean, sdp?: string) {
    const state = this.activeCalls.get(callId);
    if (!state) return;

    state.status = accepted ? 'active' : 'declined';
    state.sdpAnswer = sdp;

    connectionManager.send(state.peerId, {
      type: 'call.answer',
      id: 'ans_' + uuidv4(),
      ts: Date.now(),
      payload: {
        callId,
        accepted,
        sdp
      }
    });
  }

  public async sendIceCandidate(callId: string, candidate: any) {
    const state = this.activeCalls.get(callId);
    if (!state) return;

    connectionManager.send(state.peerId, {
      type: 'call.ice',
      id: 'ice_' + uuidv4(),
      ts: Date.now(),
      payload: {
        callId,
        candidate
      }
    });
  }

  public async endCall(callId: string, reason: string = 'user_ended') {
    const state = this.activeCalls.get(callId);
    if (state) {
      state.status = 'ended';
      connectionManager.send(state.peerId, {
        type: 'call.end',
        id: 'end_' + uuidv4(),
        ts: Date.now(),
        payload: { callId, reason }
      });
      this.activeCalls.delete(callId);
    }
  }

  private handleCallOffer(senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (!p || !p.callId) return;

    const identity = getOrGenerateIdentity();
    const state: ActiveCallState = {
      callId: p.callId,
      peerId: senderDeviceId,
      mediaType: p.mediaType || 'voice',
      status: 'ringing',
      sdpOffer: p.sdp
    };

    this.activeCalls.set(p.callId, state);

    this.windowRef?.webContents?.send('calls:offer-received', {
      id: p.callId,
      initiatorId: senderDeviceId,
      peerId: identity.deviceId,
      mediaType: p.mediaType || 'voice',
      status: 'ringing',
      sdp: p.sdp,
      startedAt: envelope.ts || Date.now()
    });
  }

  private handleCallAnswer(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    const state = this.activeCalls.get(p?.callId);
    if (!state) return;

    state.status = p.accepted ? 'active' : 'declined';
    state.sdpAnswer = p.sdp;

    this.windowRef?.webContents?.send('calls:answer-received', {
      callId: p.callId,
      accepted: p.accepted,
      sdp: p.sdp
    });
  }

  private handleIceCandidate(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (p && p.callId && p.candidate) {
      this.windowRef?.webContents?.send('calls:ice-candidate', {
        callId: p.callId,
        candidate: p.candidate
      });
    }
  }

  private handleCallEnd(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (p && p.callId) {
      this.activeCalls.delete(p.callId);
      this.windowRef?.webContents?.send('calls:ended', p.callId);
    }
  }
}

export const callSignalingService = new CallSignalingService();
