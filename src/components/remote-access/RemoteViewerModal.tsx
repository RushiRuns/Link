import { useEffect, useRef } from 'react';
import { useRemoteAccessStore } from '../../stores/remote-access.store';
import { useRemoteAccessWebRTC } from '../../hooks/useRemoteAccessWebRTC';
import { useRemoteInputCapture } from '../../hooks/useRemoteInputCapture';
import { RemoteAccessToolbar } from './RemoteAccessToolbar';
import { Loader2 } from 'lucide-react';

export function RemoteViewerModal() {
  const activeSession = useRemoteAccessStore((s) => s.activeSession);
  const endSession = useRemoteAccessStore((s) => s.endSession);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    remoteStream,
    isConnected,
    isInputReady,
    bitrate,
    rtt,
    inputChannel
  } = useRemoteAccessWebRTC({
    sessionId: activeSession?.sessionId || '',
    role: activeSession?.role || 'controller',
    permissionMode: activeSession?.permissionMode,
    initialSdp: activeSession?.initialSdp
  });

  // Attach video stream
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Activate input capture hook only if we have full control
  const isFullControl = activeSession?.permissionMode === 'full-control';
  useRemoteInputCapture({
    videoRef,
    inputChannel,
    isActive: isFullControl && isConnected && isInputReady
  });

  if (!activeSession || activeSession.role !== 'controller') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        zIndex: 1201, // Above CallScreen (1200)
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <RemoteAccessToolbar 
        permissionMode={activeSession.permissionMode}
        rtt={rtt}
        bitrate={bitrate}
        onDisconnect={() => endSession()}
      />

      {/* Loading State Overlay */}
      {!isConnected && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <Loader2 size={48} className="lucide-spin" color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: 'var(--space-4)', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>
            Connecting to {activeSession.peerName}...
          </p>
        </div>
      )}

      {/* Main Remote Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          cursor: isFullControl ? 'none' : 'default', // Hide local cursor when controlling
          opacity: isConnected ? 1 : 0,
          transition: 'opacity 0.3s'
        }}
      />
    </div>
  );
}
