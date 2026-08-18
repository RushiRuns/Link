export type PermissionMode = 'view-only' | 'full-control';

export interface RemoteAccessSession {
  sessionId: string;
  peerId: string;
  peerName: string;
  sessionToken: string;
  permissionMode: PermissionMode;
  role: 'host' | 'controller';
}

export interface IncomingRemoteRequest {
  sessionId: string;
  peerId: string;
  peerName: string;
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
