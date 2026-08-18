import { connectionManager } from '../network/connection-manager.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { v4 as uuidv4 } from 'uuid';
import { inputSimulator } from './input-simulator.js';
import { RemoteAccessSession, PermissionMode, RaRequestPayload } from './types.js';

class RemoteAccessService {
  private windowRef: any = null;
  private activeSessions: Map<string, RemoteAccessSession> = new Map();

  public init(mainWindow: any) {
    this.windowRef = mainWindow;

    connectionManager.on('message', (senderDeviceId: string, envelope: any) => {
      // Early exit guard: Only handle remote-access messages
      if (!envelope.type.startsWith('ra.')) return;

      switch (envelope.type) {
        case 'ra.request':
          this.handleRequest(senderDeviceId, envelope);
          break;
        case 'ra.accept': // Host accepts, sends SDP offer (since it's sharing screen) + token
          this.handleAccept(senderDeviceId, envelope);
          break;
        case 'ra.answer': // Controller sends SDP answer
          this.handleAnswer(senderDeviceId, envelope);
          break;
        case 'ra.ice':
          this.handleIce(senderDeviceId, envelope);
          break;
        case 'ra.end':
          this.handleEnd(senderDeviceId, envelope);
          break;
      }
    });

    connectionManager.on('peer:disconnected', (peerId: string) => {
      for (const [sessionId, state] of this.activeSessions.entries()) {
        if (state.peerId === peerId) {
          this.terminateSession(sessionId, 'connection_lost');
        }
      }
    });
  }

  public setWindow(mainWindow: any) {
    this.windowRef = mainWindow;
  }

  // --- Outgoing methods called by IPC Handlers from Renderer ---

  // Called by Controller
  public async sendRequest(peerId: string) {
    const sessionId = 'ra_' + uuidv4();
    const identity = getOrGenerateIdentity();
    
    // We don't have a token or permission mode yet
    this.activeSessions.set(sessionId, {
      sessionId,
      peerId,
      sessionToken: '',
      permissionMode: 'view-only', // placeholder
      role: 'controller'
    });

    connectionManager.send(peerId, {
      type: 'ra.request',
      id: 'ra_req_' + uuidv4(),
      ts: Date.now(),
      payload: {
        sessionId,
        peerName: identity.displayName
      }
    });

    return sessionId;
  }

  // Called by Host
  public async sendAccept(sessionId: string, permissionMode: PermissionMode, sdpOffer: string) {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    // Host generates the token
    const sessionToken = uuidv4();
    state.sessionToken = sessionToken;
    state.permissionMode = permissionMode;

    if (permissionMode === 'full-control') {
      inputSimulator.start(sessionToken);
    }

    connectionManager.send(state.peerId, {
      type: 'ra.accept',
      id: 'ra_acc_' + uuidv4(),
      ts: Date.now(),
      payload: {
        sessionId,
        sessionToken,
        permissionMode,
        sdp: sdpOffer
      }
    });
  }

  // Called by Controller
  public async sendAnswer(sessionId: string, sdp: string) {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    connectionManager.send(state.peerId, {
      type: 'ra.answer',
      id: 'ra_ans_' + uuidv4(),
      ts: Date.now(),
      payload: { sessionId, sdp }
    });
  }

  // Called by either
  public async sendIceCandidate(sessionId: string, candidate: any) {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    connectionManager.send(state.peerId, {
      type: 'ra.ice',
      id: 'ra_ice_' + uuidv4(),
      ts: Date.now(),
      payload: { sessionId, candidate }
    });
  }

  // Called by either
  public async endSession(sessionId: string, reason: string = 'user_ended') {
    const state = this.activeSessions.get(sessionId);
    if (state) {
      connectionManager.send(state.peerId, {
        type: 'ra.end',
        id: 'ra_end_' + uuidv4(),
        ts: Date.now(),
        payload: { sessionId, reason }
      });
      this.terminateSession(sessionId, reason, false);
    }
  }

  // --- Incoming message handlers ---

  private handleRequest(senderDeviceId: string, envelope: any) {
    const p = envelope.payload as RaRequestPayload;
    if (!p || !p.sessionId) return;

    // Track as incoming request on the Host side
    this.activeSessions.set(p.sessionId, {
      sessionId: p.sessionId,
      peerId: senderDeviceId,
      sessionToken: '',
      permissionMode: 'view-only',
      role: 'host'
    });

    this.windowRef?.webContents?.send('remote-access:request-received', {
      sessionId: p.sessionId,
      peerId: senderDeviceId,
      peerName: p.peerName
    });
  }

  private handleAccept(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (!p || !p.sessionId) return;

    const state = this.activeSessions.get(p.sessionId);
    if (!state || state.role !== 'controller') return;

    state.sessionToken = p.sessionToken;
    state.permissionMode = p.permissionMode;

    this.windowRef?.webContents?.send('remote-access:session-accepted', {
      sessionId: p.sessionId,
      sessionToken: p.sessionToken,
      permissionMode: p.permissionMode,
      sdp: p.sdp
    });
  }

  private handleAnswer(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (!p || !p.sessionId) return;

    const state = this.activeSessions.get(p.sessionId);
    if (!state || state.role !== 'host') return;

    this.windowRef?.webContents?.send('remote-access:answer-received', {
      sessionId: p.sessionId,
      sdp: p.sdp
    });
  }

  private handleIce(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (!p || !p.sessionId || !p.candidate) return;

    if (!this.activeSessions.has(p.sessionId)) return;

    this.windowRef?.webContents?.send('remote-access:ice-received', {
      sessionId: p.sessionId,
      candidate: p.candidate
    });
  }

  private handleEnd(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (!p || !p.sessionId) return;

    this.terminateSession(p.sessionId, p.reason || 'peer_ended');
  }

  // Helper to cleanup
  private terminateSession(sessionId: string, reason: string, notifyRenderer: boolean = true) {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    if (state.role === 'host') {
      inputSimulator.stop();
    }

    this.activeSessions.delete(sessionId);

    if (notifyRenderer) {
      this.windowRef?.webContents?.send('remote-access:session-ended', { sessionId, reason });
    }
  }

  // Called directly from DataChannel IPC to validate and inject input
  public handleInputInject(sessionId: string, token: string, event: any) {
    const state = this.activeSessions.get(sessionId);
    if (!state || state.role !== 'host' || state.permissionMode !== 'full-control') return;
    
    // validate token securely
    if (state.sessionToken !== token) return;
    
    inputSimulator.handleInputEvent({ ...event, token });
  }
}

export const remoteAccessService = new RemoteAccessService();
