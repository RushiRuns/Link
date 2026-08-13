import { useEffect, useRef, useState } from 'react';
import { useCallsStore } from '../../stores/calls.store';
import { useWebRTC } from '../../hooks/useWebRTC';
import { CallControls } from './CallControls';
import { User, Shield, MicOff, VideoOff, Loader2, Minimize2, Maximize2, PhoneOff, MessageSquare, Activity } from 'lucide-react';
import { playRingbackTone, stopRingbackTone } from '../../utils/audio';
import { useAppStore } from '../../stores/app.store';

export function CallScreen() {
  const { activeCall, endCall } = useCallsStore();
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const [pipPos, setPipPos] = useState({ x: 0, y: 0 });
  const [pipCorner, setPipCorner] = useState<'tr' | 'tl' | 'br' | 'bl'>('br');
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const {
    remoteStream,
    localStream,
    isConnected,
    isAudioMuted,
    isVideoMuted,
    bitrate,
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

  // Outgoing ringback tone
  useEffect(() => {
    if (activeCall?.status === 'ringing' && !activeCall.isIncoming) {
      playRingbackTone();
    } else {
      stopRingbackTone();
    }
    return stopRingbackTone;
  }, [activeCall?.status, activeCall?.isIncoming]);

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
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return `${h.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const getColor = (name?: string) => {
    if (!name) return 'var(--accent-primary)';
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#D4A5A5', '#9B59B6', '#3498DB'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const isVideo = activeCall.mediaType === 'video';
  const avatarColor = getColor(activeCall.peerName);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: pipPos.x, initialY: pipPos.y };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPipPos({ x: dragRef.current.initialX + dx, y: dragRef.current.initialY + dy }); 
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    const isTop = e.clientY < window.innerHeight / 2;
    const isLeft = e.clientX < window.innerWidth / 2;
    if (isTop && isLeft) setPipCorner('tl');
    if (isTop && !isLeft) setPipCorner('tr');
    if (!isTop && isLeft) setPipCorner('bl');
    if (!isTop && !isLeft) setPipCorner('br');
    setPipPos({ x: 0, y: 0 });
  };

  const getPipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute', width: 180, height: 120, borderRadius: 'var(--radius-md)',
      overflow: 'hidden', border: '2px solid rgba(255, 255, 255, 0.3)',
      boxShadow: 'var(--shadow-lg)', backgroundColor: '#000000',
      cursor: isDragging ? 'grabbing' : 'grab', zIndex: 10,
      transform: `translate(${pipPos.x}px, ${pipPos.y}px)`,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
    };
    if (pipCorner === 'tl') return { ...base, top: 20, left: 20 };
    if (pipCorner === 'tr') return { ...base, top: 20, right: 20 };
    if (pipCorner === 'bl') return { ...base, bottom: 20, left: 20 };
    return { ...base, bottom: 20, right: 20 };
  };

  return (
    <div
      style={
        isMinimized
          ? {
              position: 'fixed',
              top: 16,
              right: 16,
              width: 320,
              backgroundColor: 'var(--bg-card)',
              zIndex: 1200,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }
          : {
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
              color: '#ffffff',
              transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }
      }
    >
      {/* Minimized Floating Bar */}
      {isMinimized && (
        <div style={{ display: 'flex', padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {getInitials(activeCall.peerName)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{activeCall.peerName || 'Teammate'}</span>
                <span style={{ fontSize: '0.75rem', color: isConnected ? 'var(--status-online)' : 'var(--text-secondary)' }}>
                   {isConnected ? formatTime(duration) : 'Connecting...'}
                </span>
              </div>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setIsMinimized(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} title="Expand">
                <Maximize2 size={18} />
              </button>
              <button onClick={() => endCall()} style={{ background: 'var(--status-error)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="End Call">
                <PhoneOff size={16} />
              </button>
           </div>
        </div>
      )}

      {/* Full-Screen Content Wrapper */}
      <div style={{ display: isMinimized ? 'none' : 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
        
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: isConnected ? 'var(--status-online)' : 'var(--text-secondary)' }}>
              <Shield size={14} color={isConnected ? "var(--status-online)" : "var(--text-secondary)"} />
              <span>{isConnected ? "Encrypted WebRTC Stream" : "Establishing Encrypted Stream..."}</span>
            </div>
            {isConnected && bitrate > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <Activity size={12} />
                <span>{bitrate} kbps</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => {
              useAppStore.getState().setSelectedPeer(activeCall.peerId);
              setIsMinimized(true);
            }}
            style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s' }}
            title="Go to Chat"
          >
            <MessageSquare size={14} /> Go to Chat
          </button>

          <button 
            onClick={() => setIsMinimized(true)}
            style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Minimize Call"
          >
            <Minimize2 size={16} />
          </button>
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
              style={getPipStyle()}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
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
                backgroundColor: avatarColor + '20', // 20 hex is 12% opacity
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 40px ${avatarColor}15`,
                position: 'relative'
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 700, color: avatarColor }}>
                {getInitials(activeCall.peerName)}
              </span>
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

      <div style={{ width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'center' }}>
          <CallControls
            mediaType={activeCall.mediaType}
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onEndCall={endCall}
            isMediaReady={isConnected || !!localStream}
          />
        </div>
      </div>
    </div>
  );
}
