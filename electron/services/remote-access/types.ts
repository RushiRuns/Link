export type PermissionMode = 'view-only' | 'full-control';

export interface RemoteAccessSession {
  sessionId: string;
  peerId: string;
  sessionToken: string;
  permissionMode: PermissionMode;
  role: 'host' | 'controller';
}

export interface RaRequestPayload {
  sessionId: string;
  peerName: string;
}

export interface RaAcceptPayload {
  sessionId: string;
  sessionToken: string;
  permissionMode: PermissionMode;
}

export interface RaIcePayload {
  sessionId: string;
  candidate: any; // RTCIceCandidateInit
}

export interface RaSdpPayload {
  sessionId: string;
  sdp: string;
}

export interface RaEndPayload {
  sessionId: string;
  reason?: string;
}

export interface RaInputEvent {
  token: string;
  type: 'mousemove' | 'mousedown' | 'mouseup' | 'wheel' | 'keydown' | 'keyup';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  deltaY?: number;
  vkCode?: number;
}
