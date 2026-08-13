import { useEffect, useRef, useState } from 'react';
import { useCallsStore } from '../../stores/calls.store';
import { useWebRTC } from '../../hooks/useWebRTC';
import { CallControls } from './CallControls';
import { User, Shield, MicOff, VideoOff, Loader2 } from 'lucide-react';

export function CallScreen() {
  const { activeCall, endCall } = useCallsStore();
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

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
    peerId: activeCall?.peerId || '',
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
    const localVideo = localVideoRef.current;
    const remoteVideo = remoteVideoRef.current;
    const remoteAudio = remoteAudioRef.current;

    if (localVideo && localStream) {
      localVideo.srcObject = localStream;
    }
    
    if (remoteStream) {
      if (activeCall?.mediaType === 'video' && remoteVideo) {
        remoteVideo.srcObject = remoteStream;
      } else if (activeCall?.mediaType === 'voice' && remoteAudio) {
        remoteAudio.srcObject = remoteStream;
      }
    }

    return () => {
      if (localVideo) localVideo.srcObject = null;
      if (remoteVideo) remoteVideo.srcObject = null;
      if (remoteAudio) remoteAudio.srcObject = null;
    };
  }, [localStream, remoteStream, activeCall?.mediaType]);

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
              {activeCall.status === 'declined' ? 'Call Declined' :
               activeCall.status === 'no_answer' ? 'No Answer' :
               activeCall.status === 'busy' ? 'User Busy' :
               isConnected ? formatTime(duration) : 'Connecting P2P stream...'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: isConnected ? 'var(--status-online)' : 'var(--text-secondary)' }}>
          <Shield size={14} color={isConnected ? "var(--status-online)" : "var(--text-secondary)"} />
          <span>{isConnected ? "Encrypted WebRTC Stream" : "Establishing Encrypted Stream..."}</span>
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

            {activeCall.isRemoteVideoMuted && (
              <div style={{ position: 'absolute', top: 20, left: 20, padding: '8px 12px', background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.85rem' }}>
                <VideoOff size={16} />
                <span>Peer Muted Video</span>
              </div>
            )}

            {activeCall.isRemoteAudioMuted && (
              <div style={{ position: 'absolute', top: 20, right: 20, padding: '8px 12px', background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.85rem' }}>
                <MicOff size={16} />
                <span>Peer Muted Audio</span>
              </div>
            )}

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
              {!localStream && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#222', zIndex: 2 }}>
                  <Loader2 size={24} className="spin-animation" color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 4 }}>Initializing...</span>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin-animation { animation: spin 1s linear infinite; }`}</style>
                </div>
              )}
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
                boxShadow: '0 0 40px rgba(255, 255, 255, 0.08)',
                position: 'relative'
              }}
            >
              <User size={48} color="var(--accent-primary)" />
              {activeCall.isRemoteAudioMuted && (
                <div style={{ position: 'absolute', bottom: -12, right: -12, padding: '6px', background: 'var(--status-offline)', borderRadius: '50%', color: '#fff', display: 'flex' }}>
                  <MicOff size={16} />
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              {activeCall.status === 'declined' ? (activeCall.isIncoming ? 'You Declined' : 'Peer Declined') :
               activeCall.status === 'no_answer' ? (activeCall.isIncoming ? 'Missed Call' : 'No Answer') :
               activeCall.status === 'ringing' ? 'Ringing...' :
               activeCall.status === 'connecting' ? 'Connecting...' :
               activeCall.status === 'busy' ? 'User Busy' :
               activeCall.status === 'ended' ? 'Call Ended' : 'Connecting...'}
            </div>
            {/* Hidden audio element for remote voice stream */}
            <audio ref={remoteAudioRef} autoPlay />
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
        isMediaReady={!!localStream}
      />
    </div>
  );
}
