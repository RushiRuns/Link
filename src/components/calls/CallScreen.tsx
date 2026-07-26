import { useEffect, useRef, useState } from 'react';
import { useCallsStore } from '../../stores/calls.store';
import { useWebRTC } from '../../hooks/useWebRTC';
import { CallControls } from './CallControls';
import { User, Shield } from 'lucide-react';

export function CallScreen() {
  const { activeCall, endCall } = useCallsStore();
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    remoteStream,
    localStream,
    isConnected,
    isAudioMuted,
    isVideoMuted,
    toggleAudio,
    toggleVideo
  } = useWebRTC({
    callId: activeCall?.callId || '',
    mediaType: activeCall?.mediaType || 'voice',
    isIncoming: activeCall?.isIncoming || false,
    initialSdpOffer: activeCall?.sdpOffer
  });

  // Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  // Attach local and remote streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  if (!activeCall) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isVideo = activeCall.mediaType === 'video';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0d0e12',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-6)',
        color: '#ffffff'
      }}
    >
      {/* Call Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600
            }}
          >
            <User size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
              {activeCall.peerName || 'Teammate'}
            </div>
            <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
              {isConnected ? formatTime(duration) : 'Connecting P2P stream...'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--status-online)' }}>
          <Shield size={14} color="var(--status-online)" />
          <span>Encrypted WebRTC Stream</span>
        </div>
      </div>

      {/* Main Stream Area */}
      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 900,
          margin: 'var(--space-4) 0',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#14161b',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {isVideo ? (
          <>
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Local Video Stream Picture-in-Picture */}
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                width: 180,
                height: 120,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: 'var(--shadow-lg)',
                backgroundColor: '#000000'
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </>
        ) : (
          /* Voice Call Avatar Centerpiece */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(56, 189, 248, 0.25)'
              }}
            >
              <User size={48} color="var(--accent-primary)" />
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              {isConnected ? 'Voice Call Connected' : 'Ringing...'}
            </div>
            {/* Hidden audio element for remote voice stream */}
            <audio ref={remoteVideoRef as any} autoPlay />
          </div>
        )}
      </div>

      {/* Control Bar */}
      <CallControls
        mediaType={activeCall.mediaType}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onEndCall={endCall}
      />
    </div>
  );
}
